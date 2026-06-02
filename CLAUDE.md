# CLAUDE.md — AI Assistant Guide for larksuite/cli

This file provides context for AI assistants (Claude Code, etc.) working in this repository.

## Project Overview

`lark-cli` is the official Go CLI for the **Lark/Feishu Open Platform**. It enables developers and AI agents to interact with Lark APIs from the terminal. The binary is distributed via npm (`npx lark-cli`) and direct GitHub releases.

- **Module:** `github.com/larksuite/cli`
- **Language:** Go 1.23+
- **Binary name:** `lark-cli`
- **License:** MIT

## Repository Structure

```
cli/
├── main.go                  # Entry point — calls cmd.Execute()
├── cmd/                     # Cobra command definitions
│   ├── root.go              # Root command, error handling, flag definitions
│   ├── api/                 # lark-cli api <METHOD> <path>
│   ├── auth/                # lark-cli auth login/logout/status
│   ├── config/              # lark-cli config get/set
│   ├── doctor/              # lark-cli doctor (diagnostics)
│   ├── schema/              # lark-cli schema <service.resource.method>
│   ├── service/             # Dynamic service command loader
│   └── completion/          # Shell completion
├── internal/                # Private packages (not importable externally)
│   ├── auth/                # OAuth device flow, token storage, scope validation
│   ├── build/               # Version/date constants injected at build time
│   ├── client/              # Lark SDK wrapper, raw HTTP requests
│   ├── cmdutil/             # CLI factory, flag helpers, tips
│   ├── core/                # Identity types (user/bot/auto), config, context
│   ├── httpmock/            # HTTP mocking utilities for tests
│   ├── keychain/            # OS-native credential storage (go-keyring)
│   ├── lockfile/            # File locking for config consistency
│   ├── output/              # Structured errors, JSON/CSV/table/ndjson output
│   ├── registry/            # API schema registry, command metadata
│   ├── util/                # General utilities
│   └── validate/            # Input validation, ID encoding, scope checking
├── shortcuts/               # High-level "+shortcut" commands (domain packages)
│   ├── common/              # Shortcut framework: Shortcut type, runner, helpers
│   ├── calendar/            # lark-cli calendar +agenda, +events-today, etc.
│   ├── im/                  # lark-cli im +send-message, +list-chats, etc.
│   ├── doc/                 # lark-cli doc +create, +search, etc.
│   ├── drive/               # lark-cli drive +list, +upload, etc.
│   ├── sheets/              # lark-cli sheets +read, +write, etc.
│   ├── base/                # lark-cli base +list-records, etc.
│   ├── contact/             # lark-cli contact +search-user, etc.
│   ├── task/                # lark-cli task +create, +list, etc.
│   ├── mail/                # lark-cli mail +send, +list, etc.
│   ├── event/               # lark-cli event +list, etc.
│   ├── vc/                  # lark-cli vc +list-meetings, etc.
│   └── whiteboard/          # lark-cli whiteboard +list, etc.
├── skills/                  # AI agent skill documentation (SKILL.md per domain)
│   ├── lark-calendar/
│   ├── lark-im/
│   ├── lark-doc/
│   └── ... (19 total domains)
├── skill-template/          # Template for creating new skills
├── scripts/
│   ├── fetch_meta.py        # Fetches API metadata — MUST run before build/test/lint
│   ├── install.js           # npm postinstall: downloads pre-built binary
│   └── run.js               # npm bin wrapper
├── tests/                   # Integration tests (require built binary)
├── .github/workflows/       # CI: tests.yml, lint.yml, coverage.yml, release.yml
├── Makefile                 # Build automation
├── go.mod / go.sum          # Go module dependencies
├── package.json             # npm package metadata
└── .goreleaser.yml          # Cross-platform release config
```

## Build & Development

### Prerequisites

- Go 1.23+
- Python 3 (for `scripts/fetch_meta.py`)

### Critical: Always Run `fetch_meta` First

`scripts/fetch_meta.py` generates API metadata files that are required by the compiler. **All build, test, and lint commands depend on this step.** The Makefile handles this automatically — when running `go` commands directly, run it first:

```bash
python3 scripts/fetch_meta.py
```

### Common Commands

```bash
make build           # Build binary → ./lark-cli
make test            # vet + unit tests + integration tests (full suite)
make unit-test       # Unit tests only (faster, no binary needed)
make vet             # go vet analysis
make integration-test  # Integration tests (requires built binary)
make install         # Install to /usr/local/bin (override with PREFIX=...)
make clean           # Remove ./lark-cli binary
```

### Running Tests Directly

```bash
# Unit tests (matches CI exactly)
go test -v -race -count=1 -timeout=30s ./cmd/... ./internal/... ./shortcuts/...

# Integration tests
go test -v -count=1 ./tests/...

# Single package
go test -v -race ./shortcuts/calendar/...

# With coverage
go test -coverprofile=coverage.txt -covermode=atomic ./...
```

### Build Flags

Version and date are injected at compile time:
```bash
go build -trimpath -ldflags "-s -w \
  -X github.com/larksuite/cli/internal/build.Version=$(git describe --tags --always) \
  -X github.com/larksuite/cli/internal/build.Date=$(date +%Y-%m-%d)" \
  -o lark-cli .
```

## Code Conventions

### File Headers

Every `.go` file starts with:
```go
// Copyright (c) 2026 Lark Technologies Pte. Ltd.
// SPDX-License-Identifier: MIT
```

### Package Naming

- Package names: lowercase, no underscores (e.g., `calendar`, `cmdutil`)
- File names: lowercase with underscores (e.g., `calendar_agenda.go`)
- Exported identifiers: `CamelCase`
- Unexported identifiers: `camelCase`

### Error Handling

- Use `*output.ExitError` for structured errors with exit codes
- Use `output.ErrWithHint(code, errType, message, hint)` for user-facing errors
- Errors flow up to `handleRootError` in `cmd/root.go`
- JSON error envelopes are written to stderr; clean output goes to stdout
- Exit code 0 = success, non-zero = failure

### Output Formats

The `--format` flag supports: `json` (default), `pretty`, `table`, `csv`, `ndjson`

Use `internal/output` for all formatted output. Never write to stdout directly from shortcuts — use the `RuntimeContext` output helpers.

### Identity Types

Commands support three identity modes via `--as`:
- `user` — acts as the authenticated user (OAuth token)
- `bot` — acts as the app/bot
- `auto` — automatically selects based on context (default)

Shortcuts declare supported identities via `AuthTypes []string` in the `Shortcut` struct.

## Adding a New Shortcut

Shortcuts live in `shortcuts/<domain>/`. Each file defines one or more `Shortcut` structs and a `Shortcuts()` function.

### Pattern

```go
// shortcuts/calendar/calendar_my_event.go
package calendar

import (
    "context"
    "github.com/larksuite/cli/shortcuts/common"
)

var myEventShortcut = common.Shortcut{
    Service:     "calendar",
    Command:     "+my-event",
    Description: "Brief description of what this does",
    Risk:        "read", // "read" | "write" | "high-risk-write"
    AuthTypes:   []string{"user"},
    UserScopes:  []string{"calendar:calendar:readonly"},
    HasFormat:   true,
    Flags: []common.Flag{
        {Name: "calendar-id", Desc: "Calendar ID (default: primary)", Default: "primary"},
    },
    DryRun: func(ctx context.Context, rt *common.RuntimeContext) *common.DryRunAPI {
        // Return what API call would be made
    },
    Validate: func(ctx context.Context, rt *common.RuntimeContext) error {
        // Optional pre-execution validation
        return nil
    },
    Execute: func(ctx context.Context, rt *common.RuntimeContext) error {
        // Main logic
        return nil
    },
}
```

Then register it in the domain's `Shortcuts()` function:
```go
func Shortcuts() []common.Shortcut {
    return []common.Shortcut{
        myEventShortcut,
        // ...
    }
}
```

The domain package must be added to `shortcuts/register.go` if it's new.

### Shortcut Struct Fields

| Field | Description |
|-------|-------------|
| `Service` | CLI service name (e.g., `"calendar"`) |
| `Command` | Command name, must start with `+` (e.g., `"+agenda"`) |
| `Description` | Short help text |
| `Risk` | `"read"` / `"write"` / `"high-risk-write"` |
| `AuthTypes` | `["user"]`, `["bot"]`, or `["user", "bot"]` |
| `Scopes` | Default OAuth scopes (fallback) |
| `UserScopes` | Scopes when acting as user (overrides `Scopes`) |
| `BotScopes` | Scopes when acting as bot (overrides `Scopes`) |
| `HasFormat` | Auto-inject `--format` flag |
| `Flags` | Declarative flag definitions |
| `Tips` | Extra tips shown in `--help` |
| `DryRun` | Optional: describe API call without executing |
| `Validate` | Optional: pre-execution checks |
| `Execute` | Required: main business logic |

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `github.com/spf13/cobra` | CLI framework |
| `github.com/larksuite/oapi-sdk-go/v3` | Official Lark API SDK |
| `github.com/charmbracelet/huh` | Interactive TUI prompts |
| `github.com/charmbracelet/lipgloss` | Terminal styling |
| `github.com/zalando/go-keyring` | OS-native credential storage |
| `github.com/smartystreets/goconvey` | BDD-style test assertions |
| `github.com/gofrs/flock` | File locking |
| `github.com/skip2/go-qrcode` | QR code for auth flow |

## CI/CD

Four GitHub Actions workflows:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `tests.yml` | push/PR to main | Unit tests with race detection |
| `lint.yml` | push/PR to main | staticcheck, golangci-lint, go vet |
| `coverage.yml` | push/PR to main | Coverage → Codecov |
| `release.yml` | tag `v*` | GoReleaser cross-platform builds |

All workflows run `python3 scripts/fetch_meta.py` before any Go steps.

Release artifacts: `linux/darwin/windows × amd64/arm64` as `.tar.gz` / `.zip`.

## AI Skills

The `skills/` directory contains `SKILL.md` files for 19 domains. These are installed into AI agent environments via:

```bash
npx skills add larksuite/cli --all -y
npx skills add larksuite/cli -s lark-calendar -y
```

When working on skill documentation, note that SKILL.md files are bilingual (English + Chinese) and include **CRITICAL** warnings for dangerous operations.

## Notes for AI Assistants

- **Always run `python3 scripts/fetch_meta.py` before building or running tests.** The Makefile targets do this automatically; direct `go` commands do not.
- Output formatting (`--format`) uses `internal/output` — never write to stdout directly from shortcut `Execute` functions.
- The `+` prefix on shortcut command names is intentional and required.
- Scope selection follows least-privilege: `UserScopes`/`BotScopes` override `Scopes` when set.
- Integration tests (`./tests/...`) require a built binary and live credentials — do not run these in CI-like environments without proper setup.
- The `internal/httpmock` package is available for mocking HTTP calls in unit tests.
- When adding new shortcuts, add a corresponding `_test.go` file in the same package.
