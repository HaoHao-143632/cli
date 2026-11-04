# lark-cli verification map

This directory is the maintained source for verifying the user-facing behavior of `lark-cli` built from this checkout. Read this index before driving, then use the matching feature file as the recipe.

## Baseline preconditions

- `S=.cursor/skills/verify-lark-cli/scripts/verify.sh`, run from the repo root.
- `eval "$($S launch)"` succeeded: `./lark-cli` was built by `make build` and `RUN_ID`, `RUN_DIR`, `EVIDENCE_DIR` are exported.
- `$S doctor` exits 0 (binary present, version matches `git describe`, build fresh, sandbox HOME isolated, `unshare -rn` available).
- The sandbox starts **unconfigured**. Features that need an app config say so and run `$S placeholder-app` first.
- No real Feishu/Lark credentials exist in this environment. Never copy the user's `~/.lark-cli` or `~/.local/share/lark-cli` into the sandbox.

## Driving conventions

- Drive every command through `$S run <feature-id> <label> [--offline] -- <args>`. Do not call `./lark-cli` directly for proof; it would use your real HOME.
- Use `--offline` for every journey that must not touch the network (help, schema, dry-run, local config). Online journeys are only in [live-api](./live-api.md).
- Treat every command as literal. Keep quoted values and flags unchanged.
- Assert on the exit code and on specific stdout/stderr text. Error envelopes go to stderr; results go to stdout.
- Start each feature from a fresh `RUN_ID` when it says "fresh sandbox"; otherwise state carries over within a run.

## Proof and skip reporting

- CLI proof is the `.cmd`, `.stdout`, `.stderr`, `.exit` and `.fs.txt` files under `$EVIDENCE_DIR/<feature-id>/` plus the matching `transcript.md` block.
- Mutation proof (config writes) includes the `.fs.txt` side-effect listing and a read-only second view (`config show`, `auth status`).
- Record the feature ID and entry point used with every artifact; the helper's directory layout does this.
- Report an unreachable path with the attempted command and the unmet precondition (e.g. "no real app credentials", "user OAuth not completed").
- Do not report a skipped entry point as verified through a different path. A `--dry-run` pass does not verify the live call.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with verify.sh` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [CLI basics](./cli-basics.md) covers `--help`, `--version`, per-service help, shell completion, and unknown-command errors.
- [Schema introspection](./schema.md) covers listing services and inspecting a service, resource, or method in JSON and pretty form.
- [Dry-run previews](./dry-run.md) covers `--dry-run` on shortcuts, generated API commands, and raw `api` calls, proven offline.
- [Config and auth state](./config-auth.md) covers non-interactive `config init`, `config show`, `auth status`, `auth check`, `auth list`, and `doctor`.
- [Live API calls](./live-api.md) covers real Feishu calls; credential-gated and blocked in environments without a real app and user login.
