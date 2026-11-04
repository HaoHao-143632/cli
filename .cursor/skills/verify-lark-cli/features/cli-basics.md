# CLI basics

A user discovers what `lark-cli` can do from its help text, confirms which build they are running, enables shell completion, and gets a clear error for a mistyped command. None of this needs configuration or network.

## Sub-features

- `basics-help` prints the root help with usage, examples, and global flags.
- `basics-version` prints `lark-cli version <git describe>` for this build.
- `basics-service-help` lists a service's shortcuts (`+name`) and generated resource commands.
- `basics-completion` emits a shell completion script.
- `basics-unknown` rejects an unknown command with a non-zero exit.

## How to get to it (user POV)

- Run `lark-cli --help` (or `lark-cli` with no args).
- Run `lark-cli --version` or `lark-cli -v`.
- Run `lark-cli <service> --help`, e.g. `lark-cli calendar --help`, `lark-cli im --help`.
- Run `lark-cli completion bash|zsh|fish|powershell`.

## Driving it with verify.sh

Preconditions:

- Baseline launch and doctor done; sandbox may be fresh (no config needed).

- **Root help.** Run `$S run basics help --offline -- --help`. Exit `0`; stdout starts with `lark-cli — Lark/Feishu CLI tool.` and contains `USAGE:`, `lark-cli schema <service.resource.method>`, and `--dry-run             print request without executing`.
- **Version.** Run `$S run basics version --offline -- --version`. Exit `0`; stdout is exactly `lark-cli version <V>` where `<V>` equals `git describe --tags --always --dirty` at launch time (e.g. `968e36e` or `968e36e-dirty`).
- **Service help.** Run `$S run basics calendar-help --offline -- calendar --help`. Exit `0`; stdout starts with `Calendar, event, and attendee management` and lists `+agenda`, `+create`, `+freebusy`, `+suggestion`, and `calendars`.
- **Shortcut list for IM.** Run `$S run basics im-help --offline -- im --help`. Exit `0`; stdout lists `+messages-send` and `+chat-create`.
- **Completion.** Run `$S run basics completion --offline -- completion bash`. Exit `0`; stdout's first line is `# bash completion V2 for lark-cli`.
- **Unknown command.** Run `$S run basics unknown --offline -- notacommand`. Exit `1`; stderr contains `Error: unknown command "notacommand" for "lark-cli"`.
- **Proof.** `$EVIDENCE_DIR/basics/` holds one `.cmd/.stdout/.stderr/.exit` set per label and `transcript.md` shows `network=none (unshare -rn)` for each.

## Gotchas

- The version string comes from `git describe` at build time. Any modified tracked file adds `-dirty`; untracked files (including this skill) do not.
- This fork has no tags, so the version is a bare short SHA. The npm package reports a semver like `1.0.98` — that is the upstream release, not this checkout.
- An unknown flag (`lark-cli --bogus`) prints the full usage on stdout and the error on stderr with exit `1`; assert on stderr, not stdout.
- Service help lists come from the embedded API registry. With the default `LARKSUITE_CLI_REMOTE_META=off`, they reflect the `meta_data.json` fetched by `make build`.
