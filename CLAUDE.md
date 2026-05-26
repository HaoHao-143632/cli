# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`lark-cli` — Go CLI for the Lark/Feishu Open Platform, distributed both as a native binary and as the `@larksuite/cli` npm package. It pairs with a set of AI-agent "skills" under `skills/` that teach agents how to drive the CLI.

Two brands are supported and pick different API endpoints (`internal/core/types.go`): `feishu` (China-mainland, default) and `lark` (international). The brand also determines which meta host `scripts/fetch_meta.py` queries.

## Build, test, lint

The build pipeline depends on `internal/registry/meta_data.json`, which is **not committed**. `scripts/fetch_meta.py` downloads it from the Open Platform before every build/test/vet step. If the network call fails, builds fall back to `internal/registry/meta_data_default.json` (embedded via `go:embed`). Always run via the Makefile (or `build.sh`) rather than raw `go build` so this step happens.

```bash
make build              # fetch_meta + go build → ./lark-cli
make vet                # fetch_meta + go vet ./...
make unit-test          # fetch_meta + race tests against cmd/, internal/, shortcuts/
make integration-test   # build, then ./tests/... (this dir is not in the tree by default)
make test               # vet + unit-test + integration-test
make install PREFIX=... # installs ./lark-cli to $PREFIX/bin
python3 scripts/fetch_meta.py --brand lark   # fetch international meta instead of feishu
```

CI (`.github/workflows/`) runs `go vet`, `staticcheck`, and `golangci-lint` in addition to unit tests — match these locally before pushing.

Run a single test the standard Go way (the meta file must already exist, so run `make build` once first if you're starting clean):

```bash
go test -run TestName ./shortcuts/calendar/...
go test -race -count=1 ./internal/registry/...
```

## Architecture

### Entrypoint and command registration

`main.go` calls `cmd.Execute()` (`cmd/root.go`). The root Cobra command wires up four kinds of children, **in this order**:

1. **Static commands** under `cmd/` — `config`, `auth`, `doctor`, `api`, `schema`, `completion`.
2. **Service commands** — `service.RegisterServiceCommands` walks every project in the registry and dynamically mounts `lark-cli <service> <resource> <method>` from JSON metadata.
3. **Shortcuts** — `shortcuts.RegisterShortcuts` mounts the `+verb` commands onto the same service nodes (creating the service node if registry didn't already).

This means a single service like `calendar` ends up with both auto-generated API subcommands and hand-written `+agenda`-style shortcuts under it. When you add a new shortcut, it will automatically appear under the right service.

### Three-layer command system

| Layer | Source of truth | Entry |
|---|---|---|
| Shortcuts (`+verb`) | Go code under `shortcuts/<domain>/` declared as `common.Shortcut` structs | `shortcuts/register.go` (`allShortcuts` slice, populated in `init()`) |
| Service / API commands | `internal/registry/meta_data*.json` | `cmd/service/service.go` (`RegisterServiceCommands`) |
| Raw `lark-cli api METHOD PATH` | User-supplied | `cmd/api/api.go` |

`lark-cli schema <service.resource.method>` inspects the same registry metadata that drives layer 2 — use it before composing raw `api` calls.

### Registry (`internal/registry`)

This package owns API metadata for the entire CLI: which services exist, what their resources/methods are, parameter shapes, required scopes, supported identities. Three sources, layered:

1. **Baseline:** `meta_data_default.json` is always embedded (`loader_embedded.go`).
2. **Build-time overlay:** `meta_data.json` written by `scripts/fetch_meta.py`, embedded if present.
3. **Runtime overlay:** background refresh from the remote API into `~/.cache/...`, with TTL and brand-change handling in `loader.go` / `remote.go`.

`Init()` / `InitWithBrand()` is idempotent (`sync.Once`); call it via `LoadFromMeta` or `ListFromMetaProjects` rather than manually. Scope filtering, recommended-scope selection, and identity→token mapping all live here too (`scopes.go`).

### Factory pattern (`internal/cmdutil`)

Every command receives a `*cmdutil.Factory` (built by `cmdutil.NewDefault()` in `cmd/root.go`). Factory fields are **lazy and replaceable**: tests stub `Config`, `HttpClient`, `LarkClient`, `Keychain` etc. directly. Critical methods:

- `ResolveAs(cmd, flagAs)` — resolves the `--as user|bot|auto` flag, honouring `LARKSUITE_CLI_DEFAULT_AS` env var and `defaultAs` in config, with auto-detect fallback based on login state. Sets `f.ResolvedIdentity` and `f.IdentityAutoDetected` as side effects.
- `ResolveConfig(as)` — returns bot config or `AuthConfig()` (which requires a logged-in user) depending on identity.

### Shortcut framework (`shortcuts/common`)

A shortcut is a `common.Shortcut` struct with declarative `Flags`, `Scopes`/`UserScopes`/`BotScopes`, `AuthTypes`, and three hooks: `DryRun`, `Validate`, `Execute`. The framework auto-injects `--dry-run` (and `--format` when `HasFormat: true`), parses flags, resolves identity, builds a `*RuntimeContext`, and calls the hooks. Inside hooks use `runtime.RawAPI(...)` for SDK calls — it propagates `ctx`, identity, retries, and pagination via the cached `APIClient`.

**When adding a shortcut:** create it in `shortcuts/<domain>/<name>.go`, append it to that package's `Shortcuts()` slice, and ensure it appears in `allShortcuts` via the domain import in `shortcuts/register.go`. A test enforces that every shortcut has scopes explicitly set (`Scopes`, `UserScopes`, or `BotScopes`) — use `[]string{}` for genuinely scope-less commands rather than leaving them nil.

### Error handling (`internal/output`, `cmd/root.go`)

All command errors funnel through `handleRootError`. Two envelope formats:

- **`SecurityPolicyError`** (`internal/auth`) — gets the auth-specific JSON envelope with `challenge_url`, string codes (`challenge_required` / `access_denied`).
- **`output.ExitError`** (everything else) — standard envelope. Permission errors get enriched by `enrichPermissionError` with the recommended least-privilege scope and a `console_url` to the developer console.

Raw `api` command errors set `ExitError.Raw=true` to skip enrichment (the raw API response is already on stdout).

### AI-agent skills (`skills/`, `skill-template/`)

Each subdirectory is a self-contained skill with a `SKILL.md`. `lark-shared` is loaded first by every other skill and owns the auth/identity/security rules. Templates under `skill-template/` are used by `lark-skill-maker` and the meta-skill generation flow — they reference shared placeholder tokens (`{{service}}`, `{{shortcuts}}`, etc.) and assume `lark-cli schema` is invoked before any raw API call.

## Conventions worth knowing

- **Don't run `go build .` directly** unless `internal/registry/meta_data.json` already exists; use `make build` or run `python3 scripts/fetch_meta.py` first.
- **All file headers** carry `// Copyright (c) 2026 Lark Technologies Pte. Ltd.` and `// SPDX-License-Identifier: MIT`. Match this on new Go/Python files.
- **Identity matters everywhere.** API behaviour differs sharply between `--as user` and `--as bot` (a bot cannot see user-owned resources); shortcuts declare `AuthTypes` to constrain this and the framework rejects unsupported combinations.
- **Brand-aware code paths.** Anything that builds URLs, fetches meta, or talks to the Open Platform must branch on `core.LarkBrand`; use `core.ResolveEndpoints(brand)` rather than hardcoding hosts.
- **Secrets** live in the OS keychain via `internal/keychain` (Darwin/Windows native, Linux via `go-keyring`). Never print `AppSecret`/`AccessToken` to stdout/stderr; `internal/cmdutil/secheader.go` and the output sanitizer enforce this.
- **npm distribution** (`scripts/install.js`, `scripts/run.js`) downloads the platform-specific binary on postinstall and execs it; the package itself contains no Go source.
