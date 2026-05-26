# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`lark-cli` (npm: `@larksuite/cli`) — the official Lark/Feishu Open Platform CLI. A Go binary distributed via npm (postinstall downloads the platform-specific binary). Pairs with a set of AI Agent **Skills** under `skills/` that teach AI assistants how to drive it.

## Build, test, run

The Go build requires `meta_data.json` (API registry) to be fetched/embedded first. `make build`, `make vet`, and `make unit-test` all depend on `fetch_meta`, which runs `python3 scripts/fetch_meta.py` — so **Python 3 is required for builds** and there must be network access to `open.feishu.cn` (or `--brand lark` → `open.larksuite.com`) on the first build. The fetched file lands at `internal/registry/meta_data.json` (gitignored, but auto-embedded via `//go:embed` in `internal/registry/loader_embedded.go`). If absent, `meta_data_default.json` is used as the embedded fallback.

```bash
make build              # fetch_meta + go build → ./lark-cli
make vet                # fetch_meta + go vet ./...
make unit-test          # race-enabled tests over cmd/, internal/, shortcuts/
make test               # vet + unit-test + integration-test
make install            # build + install to /usr/local/bin (override with PREFIX=)
./build.sh              # equivalent of make build
```

Note: `make integration-test` runs `go test ./tests/...`, but the `tests/` directory is gitignored and not present in the open-source tree — that target is for internal use.

Run a single test:

```bash
go test -run TestName ./internal/auth/...
go test -race -run '^TestLogin' ./cmd/auth/
```

Lint (CI uses these — install locally to match):

```bash
staticcheck ./...
golangci-lint run
```

## Three-layer command architecture

Every Lark API capability is exposed at **three granularities**, and all three are wired up in `cmd/root.go` → `Execute()`:

1. **Shortcuts** (`shortcuts/<domain>/`) — Curated `+command` form (e.g. `calendar +agenda`, `im +messages-send`). Hand-written, AI-friendly, smart defaults, table output. Registered via `shortcuts.RegisterShortcuts`.
2. **Service / API methods** (`cmd/service/`) — Auto-generated 1:1 mapping from the Lark OpenAPI registry. `service.RegisterServiceCommands` walks `registry.ListFromMetaProjects()` and creates `<service> <resource> <method>` Cobra commands dynamically at startup from the embedded `meta_data.json`.
3. **Raw API** (`cmd/api/`) — `lark-cli api <METHOD> <path> [--params <json>] [--data <json>]`. Covers any endpoint, including ones not in the registry.

`cmd/schema/` introspects the same registry to print method signatures, scopes, and supported identities. When adding a new shortcut, mirror an existing one in `shortcuts/<domain>/` and append it to that package's `Shortcuts()` slice — the package list is wired in `shortcuts/register.go`.

## The Shortcut framework

Shortcuts are declarative. A `common.Shortcut` (see `shortcuts/common/types.go`) declares `Service`, `Command`, `AuthTypes`, `Scopes`/`UserScopes`/`BotScopes`, `Risk` (`read`|`write`|`high-risk-write`), `Flags`, `HasFormat`, plus hook functions `DryRun`, `Validate`, `Execute`. The framework (`Shortcut.Mount` in `shortcuts/common/runner.go`) handles flag registration, `--dry-run`, `--format`, `--as`, identity resolution, scope checks, and confirmation gating for high-risk writes (requires `--yes`).

Inside `Execute`, use the `*common.RuntimeContext` — never reach for `cobra.Command.Flags()` or the SDK directly:

- `runtime.Str/Bool/Int/StrArray(name)` — typed flag access
- `runtime.CallAPI` / `runtime.DoAPI` / `runtime.PaginateAll` / `runtime.StreamPages` — API calls with identity + auth handled for you (prefer `DoAPI` for new code; it uses the Lark SDK and supports `WithFileUpload`/`WithFileDownload`)
- `runtime.As()` / `runtime.IsBot()` — current identity
- `runtime.UserOpenId()` — current user id from config

`RawAPI` and `CallAPI` are deprecated wrappers around an internal HTTP path; prefer `DoAPI`.

## Identity model (`--as`)

Two identities, `user` and `bot`, resolved by `cmdutil.Factory.ResolveAs` in this priority order:

1. Explicit `--as user|bot` flag (auto re-enters auto-detect)
2. `LARKSUITE_CLI_DEFAULT_AS` env var
3. `defaultAs` in `~/.lark-cli/config.json`
4. Auto-detect: `user` if logged in with a non-expired token, else `bot`

Bot only needs `appId` + `appSecret`; user needs `auth login` and scope grants. Both bot scope (developer console) and user authorization are required for `user` calls. Errors of type `permission` are enriched in `cmd/root.go` with a recommended scope and a `console_url` that deep-links into the right developer console for the configured brand (`feishu` vs `lark`).

## API registry & metadata

`internal/registry/` is the source of truth for everything generated:

- `meta_data.json` — embedded at build time, parsed into `mergedServices`. Used by `cmd/service`, `cmd/schema`, and (for scope hints) `cmd/auth`. Fetched by `scripts/fetch_meta.py` from the Lark OpenAPI definition endpoint.
- `loader.go` also overlays a cached remote copy on startup (TTL-based background refresh) when remote fetch is enabled.
- `scope_priorities.json` / `scope_overrides.json` — drives `SelectRecommendedScope` (least-privilege scope picker used by permission-error hints and `auth login --recommend`).
- `service_descriptions.json` — localized service-name strings shown in `--help`.
- The brand (`feishu` vs `lark`) is configured at registry init and determines the remote host. The cache is invalidated when brand changes.

## Output, errors, exit codes

All structured output flows through `internal/output/`:

- Success → `Envelope{ok:true, identity, data, meta}` (`envelope.go`)
- Error → `ErrorEnvelope{ok:false, error:{type, code, message, hint, console_url, detail}}`
- Exit codes are coarse-grained (`exitcode.go`): `0` OK, `1` API, `2` validation, `3` auth, `4` network, `5` internal. Fine-grained error categories live in `error.type`, not in the exit code.
- Construct errors with the helpers in `output/errors.go` (`ErrValidation`, `ErrAuth`, `ErrNetwork`, `Errorf`, `ErrWithHint`) so they normalize into `ExitError` and get rendered as the envelope.
- `SecurityPolicyError` from `internal/auth` uses a different JSON shape (with `challenge_url`, `retryable`) and is handled explicitly in `cmd/root.go:writeSecurityPolicyError`.
- Formats (`--format`): `json` (default), `pretty`, `table`, `ndjson`, `csv`. Implementations in `internal/output/format.go`, `table.go`, `csv.go`, `flatten.go`.

## Factory pattern (dependency injection)

`internal/cmdutil/Factory` (`factory.go`, defaults in `factory_default.go`) holds every external dependency as a lazy function: `Config`, `AuthConfig`, `HttpClient`, `LarkClient`, `IOStreams`, `Keychain`. Every command is wired with `cmdutil.NewDefault()` in `Execute()`. **In tests, swap any field on the Factory** to stub out HTTP, keychain, or config — see `cmdutil/factory_test.go`, `factory_http_test.go`, and `cmdutil/testing.go` for the established patterns. Use `httpmock.Registry` from `internal/httpmock` to fake API responses.

## Config & secrets

- Config dir: `$LARKSUITE_CLI_CONFIG_DIR` or `~/.lark-cli/` (see `internal/core/config.go`).
- `config.json` is a multi-app format (`MultiAppConfig.Apps[]`); `CliConfig` is the resolved single-app view downstream code uses.
- Secrets (`appSecret`, refresh tokens) are stored via `internal/keychain/` — macOS Keychain, Windows Credential Manager, libsecret on Linux. `SecretInput` (in `core/secret.go`) supports `keychain:`, `env:`, plain string, and prompted forms.
- Atomic writes via `internal/validate/atomicwrite.go` for any persisted config/token.

## Security conventions (do not relax without strong reason)

Several validators in `internal/validate/` exist for security and are wired into the API/shortcut paths:

- `RejectControlChars` / `RejectCRLF` — block null bytes, CRLF injection, Bidi/zero-width Unicode spoofing in any user-supplied flag value.
- `StripQueryFragment` — `api` rejects query strings embedded in the path; force callers through `--params`.
- `EncodePathSegment` — used in shortcut URLs that interpolate IDs.
- `internal/cmdutil/secheader.go` — security headers attached to outbound requests.
- Output sanitization in `shortcuts/common/sanitize.go` masks secrets before printing.

The README's "Security & Risk Warnings" section is authoritative — don't add code paths that bypass `--dry-run` previews for write operations, and don't relax the `high-risk-write` confirmation gate.

## Skills (`skills/`)

19 Markdown-based AI Agent skills, each in `skills/lark-<domain>/SKILL.md` with YAML frontmatter (`name`, `version`, `description`). `lark-shared` is auto-loaded by all others and defines the security/auth conventions agents must follow (Chinese-language primary). When changing a CLI command's flags, output, or behavior, update the matching skill file so AI agents stay in sync. Templates for authoring new skills live in `skill-template/`.

## CI

`.github/workflows/`:

- `tests.yml` — `go test -race ./cmd/... ./internal/... ./shortcuts/...` (the same scope as `make unit-test`).
- `lint.yml` — `staticcheck`, `golangci-lint`, and `go vet` all in one workflow.
- `coverage.yml` — coverage for all packages, uploaded to Codecov.
- `release.yml` — goreleaser cross-platform builds per `.goreleaser.yml` (darwin/linux/windows × amd64/arm64, `CGO_ENABLED=0`).

All workflows run `python3 scripts/fetch_meta.py` before any Go step.
