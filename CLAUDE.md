# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`lark-cli` (npm: `@larksuite/cli`) — a Go CLI for the Lark/Feishu Open Platform, designed for both human users and AI agents. Ships with 19 AI Agent Skills under `skills/` that are distributed separately via `npx skills add larksuite/cli`.

## Build, Test, Lint

Building requires Go ≥ 1.23 **and** Python 3 — `make` targets shell out to `python3 scripts/fetch_meta.py` to download `internal/registry/meta_data.json` (the API surface registry) before compiling. Without it, the registry falls back to `meta_data_default.json`. The fetch hits `open.feishu.cn` (or `open.larksuite.com` with `--brand lark`) so it requires network on first build.

```bash
make build             # fetch_meta + go build → ./lark-cli
make unit-test         # go test -race -gcflags="all=-N -l" ./cmd/... ./internal/... ./shortcuts/...
make integration-test  # go test ./tests/...  (tests/ dir is gitignored / locally added)
make test              # vet + unit + integration
make install           # build and copy to $PREFIX/bin (default /usr/local/bin)
make clean

# Run a single test or package:
go test -run TestName ./internal/auth/
go test -v ./shortcuts/calendar/
```

Lint in CI uses **staticcheck** + **golangci-lint** + `go vet` (see `.github/workflows/lint.yml`). All three run `fetch_meta.py` first.

The `./tests/...` integration suite path exists in the Makefile but the directory is gitignored — only run it if you've added local integration tests.

## Architecture

### Three-layer command system

The CLI exposes the same Lark Open Platform at three granularities. Future changes should respect this layering:

1. **Shortcuts** (`shortcuts/<domain>/`) — high-level, AI-friendly commands prefixed with `+` (e.g. `lark-cli calendar +agenda`). Hand-written, opinionated, with smart defaults, table/dry-run output, and validation.
2. **API Commands** (`cmd/service/`) — auto-generated 1:1 wrappers over Lark OAPI methods. Mounted from `internal/registry/meta_data.json` at startup. Form: `lark-cli <service> <resource> <method> --params <json> --data <json>`.
3. **Raw API** (`cmd/api/`) — `lark-cli api <METHOD> <path>` for any Open Platform endpoint not modeled by 1 or 2.

`cmd/root.go` wires these together: it adds top-level commands (`config`, `auth`, `doctor`, `api`, `schema`, `completion`), then `service.RegisterServiceCommands` mounts auto-generated services from the registry, then `shortcuts.RegisterShortcuts` attaches `+`-prefixed shortcuts onto the same service nodes (creating the service node if it didn't already exist). This means a service like `calendar` ends up with both auto-generated subcommands and shortcuts under the same Cobra command.

### Registry (the API surface source of truth)

`internal/registry/` loads `meta_data.json` (embedded at build time via `//go:embed`) describing every Lark API method, its params/body schema, supported identities, and required scopes. It also overlays a remote-cached version from `~/.lark-cli/` (controlled by env vars `LARKSUITE_CLI_REMOTE_META`, `LARKSUITE_CLI_META_TTL`). The same registry powers `lark-cli schema`, the `service` auto-generator, and permission-error enrichment in `cmd/root.go:enrichPermissionError`.

When you change anything that depends on the API surface, remember the registry is data-driven — you usually edit `scope_overrides.json` / `scope_priorities.json` / `service_descriptions.json` rather than Go code.

### Shortcut framework

Every shortcut is a `common.Shortcut` struct (`shortcuts/common/types.go`) with declarative `Flags`, `AuthTypes`, `Scopes`/`UserScopes`/`BotScopes`, `Risk` (`read`/`write`/`high-risk-write`), and three hooks: `DryRun`, `Validate`, `Execute`. The framework auto-injects `--dry-run`, `--as`, and `--format` flags and constructs a `RuntimeContext` (`shortcuts/common/runner.go`) that holds the resolved identity, lazily-built API/SDK clients, and helpers like `runtime.RawAPI(method, path, params, body)`.

To add a new shortcut: drop a `var FooBar = common.Shortcut{...}` in `shortcuts/<domain>/`, append it to that domain's `Shortcuts()` slice, and ensure the domain is listed in `shortcuts/register.go`'s `init()`.

### Identity resolution

Two identities — `user` (OAuth-bound) and `bot` (app-only). Resolution order in `cmdutil.Factory.ResolveAs`:

1. Explicit `--as <user|bot>` flag (unless `--as auto`).
2. `LARKSUITE_CLI_DEFAULT_AS` env var, then `defaultAs` in config.
3. Auto-detect: if a non-expired user token exists, use `user`, otherwise `bot`.

Bot and user have very different visibility (bot can't see user resources). Shortcut `Scopes` may differ per identity via `UserScopes` / `BotScopes`. Bots only need scopes enabled in the developer console; users need both console enablement **and** `auth login --scope`.

### Auth + secrets

`internal/auth/` implements OAuth device flow, token storage, and a `SecurityPolicyError` channel for challenge-required responses (handled specially in `cmd/root.go:writeSecurityPolicyError`). Tokens and `appSecret` are stored in the OS keychain via `internal/keychain/` (zalando/go-keyring) — never logged or printed. Config files live under `~/.lark-cli/` (overridable with `LARKSUITE_CLI_CONFIG_DIR`).

### Error envelope

All structured errors normalize to `output.ExitError` and are emitted as JSON envelopes (`{"ok": false, "error": {...}}`) on stderr. `cmd/root.go:enrichPermissionError` post-processes Lark API permission errors (codes 99991672 / 99991679) by looking up the recommended scope from the registry and inserting a `console_url` and CLI hint tailored to the current identity. When adding new error paths, prefer constructing `output.ExitError` (or returning a `core.ConfigError` / `SecurityPolicyError`) rather than `fmt.Errorf` so the envelope is preserved.

### Skills

`skills/lark-*/SKILL.md` are AI-agent prompts shipped via `npx skills add larksuite/cli`. They are not loaded by the Go binary — they teach an external agent how to call the CLI. `lark-shared/SKILL.md` is the foundation every other skill expects to be auto-loaded; treat it as the canonical statement of CLI conventions for agents (identity rules, permission-denial handling, `--dry-run`, security rules). `skill-template/` contains Mustache-style templates used to regenerate per-domain skill docs from the registry.

## Conventions

- **Output format** is JSON by default. Shortcuts that opt into `HasFormat: true` get the `--format json|pretty|table|ndjson|csv` flag. Anything written to stdout/stderr should be considered machine-parseable; never print secrets.
- **Side-effecting commands must support `--dry-run`** by populating `Shortcut.DryRun`; the framework prints the proposed request and exits without calling the API.
- **Path segments in raw API URLs** must go through `validate.EncodePathSegment` to prevent injection (see `shortcuts/calendar/calendar_agenda.go:52` for an example).
- File header on all Go files: `// Copyright (c) 2026 Lark Technologies Pte. Ltd.` then `// SPDX-License-Identifier: MIT`.
- The brand affects API hostnames (`feishu` → `open.feishu.cn`, `lark` → `open.larksuite.com`); resolved in `internal/core/types.go:ResolveEndpoints`. New code that hardcodes a host is almost certainly wrong.

## Useful environment variables

- `LARKSUITE_CLI_CONFIG_DIR` — override `~/.lark-cli/`.
- `LARKSUITE_CLI_DEFAULT_AS` — `user` | `bot` | `auto`, beats config file.
- `LARKSUITE_CLI_REMOTE_META` — `off` to disable remote registry overlay.
- `LARKSUITE_CLI_META_TTL` — seconds before the cached `meta_data.json` is refreshed.
