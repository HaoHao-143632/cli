---
name: verify-lark-cli
description: "Build and drive this repo's Feishu/Lark CLI (`lark-cli`, Go binary from `make build`) the way a terminal user or AI agent does, in an isolated HOME sandbox, and capture command/stdout/stderr/exit-code evidence. Use when you need to prove CLI behavior after changing cmd/, internal/, or shortcuts/ — help/version, `schema` introspection, `--dry-run` previews, config/auth state, or (with real credentials only) live Feishu API calls."
---

# Verify lark-cli

`lark-cli` is a short-lived Go CLI. There is no server: **launch** builds `./lark-cli` from this checkout once, and every **drive** is one process invocation inside a throwaway `HOME`, recorded by `scripts/verify.sh`. Read [`features/README.md`](features/README.md) before driving; it is the maintained feature map.

All commands below run from the repo root. `S=.cursor/skills/verify-lark-cli/scripts/verify.sh` is assumed.

## Launch

Requirements: Go ≥ 1.23 (`go.mod`), Python 3 (for `scripts/fetch_meta.py`), network access to `open.feishu.cn` during the build, `make`. Node/npm is not needed.

```bash
S=.cursor/skills/verify-lark-cli/scripts/verify.sh
eval "$($S launch)"          # optional: RUN_ID=my-run eval "$($S launch)"
```

`launch` runs the README's source path (`make build` → `python3 scripts/fetch_meta.py` then `go build` with `-X internal/build.Version=$(git describe --tags --always --dirty)`), creates the sandbox `/tmp/lark-cli-verify-$RUN_ID/home`, and exports `RUN_ID`, `RUN_DIR`, `EVIDENCE_DIR`. **Ready** = stderr line `verify.sh: ready: /…/lark-cli built, sandbox HOME=…` and exit 0. On failure it prints `make build` output (also kept at `$EVIDENCE_DIR/build.log`).

Every drive runs with `env -i` plus `HOME=$RUN_DIR/home`, `LARKSUITE_CLI_CONFIG_DIR=$RUN_DIR/home/.lark-cli`, `NO_COLOR=1`, and `LARKSUITE_CLI_REMOTE_META=off` (use the build-time embedded API registry, no background registry fetch; override by exporting `LARKSUITE_CLI_REMOTE_META=on` before `run`). Both paths matter: config lives in `LARKSUITE_CLI_CONFIG_DIR` (default `~/.lark-cli`), but on Linux the encrypted "keychain" (app secrets, user tokens, `master.key`) lives in `$HOME/.local/share/lark-cli` and only follows `HOME`. Never drive the real `~/.lark-cli` — it may hold the user's logged-in tokens.

Isolation: multiple runs can coexist (distinct `RUN_ID` → distinct sandboxes and evidence dirs), but they share the single `./lark-cli` binary at the repo root. Do not launch a second run while another is driving a different source state.

Not used for verification: `npm install -g @larksuite/cli` downloads the **upstream** release binary from `github.com/larksuite/cli/releases` (e.g. `1.0.98`), not this fork's source, so it cannot prove changes in this checkout. `make install` writes to `/usr/local/bin` (needs root); if an installed binary is required, use `make install PREFIX=$RUN_DIR/prefix` and remove it in cleanup.

## Doctor

```bash
$S doctor
```

Read-only. Prints `pass`/`FAIL` for: `binary` (./lark-cli exists), `version` (`lark-cli --version` equals the `git describe` recorded at launch), `fresh-build` (no `.go` under cmd/, internal/, shortcuts/ newer than the binary — re-launch if FAIL), `sandbox-home` (sandbox exists and is not your real HOME), `unshare-netns` (`unshare -rn` works, needed for `--offline` drives). Then it shows the sandbox's own `lark-cli doctor --offline` and `lark-cli auth status`. Exit 0 only if the five harness checks pass.

Expected sandbox states (these are **not** harness failures):

- Fresh sandbox: `doctor --offline` → `config_file: fail` (`config.json: no such file`), `auth status` → `{"ok":false,"error":{"type":"config","message":"not configured"}}`.
- After `$S placeholder-app`: `config_file`/`app_resolved: pass` (`app: cli_verify_placeholder (feishu)`), `token_exists: fail` (`no user logged in`); `auth status` → `"identity": "bot"` with `"note": "No user logged in…"`.
- A real logged-in state is impossible here without the user completing browser OAuth (see Gotchas).

## Drive

```bash
$S run <feature-id> <label> [--offline] -- <lark-cli args...>
```

- Runs `./lark-cli <args>` in the sandbox. Prints `exit=<code> evidence=…` and returns the CLI's exit code (so `set -e` callers see failures).
- `--offline` wraps the call in `unshare -rn` (fresh network namespace with no interfaces). Use it for every drive that must not touch Feishu — help, schema, dry-run. If the CLI tried to reach the network it would fail with exit 4 instead of succeeding, so a 0 exit under `--offline` *is* the no-network proof.
- `$S placeholder-app` runs the CLI's own non-interactive path, `lark-cli config init --app-id cli_verify_placeholder --app-secret-stdin`, with a dummy secret piped on stdin, and records it as evidence under `setup/placeholder-app.*`. It exists only so `--dry-run` passes the config gate. It is **not** a credential; never run a non-dry-run command against it (see Gotchas).
- Feature recipes with exact args and expected output: [`features/`](features/README.md).

Exit codes (`internal/output/exitcode.go`): `0` ok, `1` API/generic (also cobra usage errors such as unknown command/flag), `2` validation (also "not configured"), `3` auth (not logged in / token invalid), `4` network, `5` internal.

Output conventions: success JSON goes to stdout; error envelopes `{"ok":false,"error":{"type","message","hint"}}` go to stderr. Dry-runs print `=== Dry Run ===` on stderr and the request JSON on stdout.

## Evidence

Location: `artifacts/verify-lark-cli/$RUN_ID/` in the repo (git-ignored; override root with `LARK_VERIFY_EVIDENCE_ROOT`). Per drive, `run` writes `<feature-id>/<label>.cmd`, `.stdout`, `.stderr`, `.exit`, `.fs.txt` (sorted file list of the sandbox HOME after the command — the side-effect view) and appends a block to `transcript.md` with the command, exit code, network mode (`none (unshare -rn)` or `host`), build version, both streams, and sandbox files. `launch` also copies `build.log`.

Proof standards:

- Drive the built binary through its real argv, exactly as a user types it. No `go test`, no calling Go functions, no editing `config.json` by hand.
- Capture the action and the resulting state: assert on stdout/stderr content **and** the exit code, not just "it printed something".
- Verify side effects separately: for config writes, check `.fs.txt` (`./.lark-cli/config.json`, `./.local/share/lark-cli/appsecret_cli_verify_placeholder.enc`) and follow with a read-only second view (`config show`, `auth status`).
- `--dry-run` is only proven side-effect-free when run with `--offline`; the network namespace shows it really skipped the request (a non-dry-run `calendar +agenda` with the placeholder app *does* reach open.feishu.cn).
- Record which entry point you drove. A feature-map entry not driven is "not verified", never "verified via another path".
- Auth-gated live calls need real app credentials and an OAuth login completed by a human. Without them, report the journey as blocked with the observed error; do not substitute dry-run output.

## Cleanup

```bash
$S cleanup
```

Removes `/tmp/lark-cli-verify-$RUN_ID` (refuses any path outside that pattern), and removes `./lark-cli` and `internal/registry/meta_data.json` **only if launch created them** (recorded in `$RUN_DIR/state`). It never touches `artifacts/verify-lark-cli/$RUN_ID/` and ends by listing it — confirm the evidence is still there. Nothing long-running is started, so there are no processes to kill; if you started `config init --new` or `auth login` in a tmux session yourself, kill that session by name. Run cleanup after failed iterations too.

## Helpers

- `scripts/verify.sh` (executable; `verify.sh` with no args prints usage). Subcommands: `launch`, `doctor`, `placeholder-app`, `run`, `cleanup`, all shown above. Requires `bash`, `make`, `go`, `python3`, `git`, and `unshare` (util-linux) for `--offline`.

Minimal end-to-end proof:

```bash
S=.cursor/skills/verify-lark-cli/scripts/verify.sh
eval "$($S launch)"
$S doctor
$S run schema method-pretty --offline -- schema im.messages.delete --format pretty
cat "$EVIDENCE_DIR/transcript.md"
$S cleanup
```
