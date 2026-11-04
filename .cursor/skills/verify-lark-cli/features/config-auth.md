# Config and auth state

A user configures which Feishu/Lark app the CLI uses, then checks what identity is available, which scopes are granted, and whether the setup is healthy. Without a browser OAuth login, the reachable states are "not configured" and "app configured, bot only".

## Sub-features

- `config-unconfigured` reports the not-configured state from `config show`, `auth status`, and `doctor`.
- `config-init-noninteractive` saves an app via `config init --app-id … --app-secret-stdin`.
- `config-show` shows the saved app with the secret masked.
- `auth-status-bot` reports bot-only identity when no user has logged in.
- `auth-check` exits non-zero for a scope that is not granted.
- `auth-list` reports no logged-in users.
- `doctor-offline` runs the CLI's health check without network.

## How to get to it (user POV)

- Run `lark-cli config init` (interactive TUI), `lark-cli config init --new` (browser app creation), or `printf '<secret>' | lark-cli config init --app-id <id> --app-secret-stdin`.
- Run `lark-cli config show`.
- Run `lark-cli auth status`, `lark-cli auth check --scope <scope>`, `lark-cli auth list`.
- Run `lark-cli doctor` or `lark-cli doctor --offline`.

## Driving it with verify.sh

Preconditions:

- Fresh sandbox from a new `RUN_ID`; baseline launch and doctor done.

- **Unconfigured show.** Run `$S run config show-empty --offline -- config show`. Exit `0`; stdout says `Not configured yet. Config file path: $RUN_DIR/home/.lark-cli/config.json`.
- **Unconfigured status.** Run `$S run config status-empty --offline -- auth status`. Exit `2`; stderr has `"type": "config"`, `"message": "not configured"`.
- **Unconfigured doctor.** Run `$S run config doctor-empty --offline -- doctor --offline`. Exit `1`; stdout JSON has `"ok": false` and one check `config_file` with `"status": "fail"`.
- **Save app.** Run `$S placeholder-app`. It pipes a dummy secret into `config init --app-id cli_verify_placeholder --app-secret-stdin` and records it as `$EVIDENCE_DIR/setup/placeholder-app.*`. Exit `0`; stdout shows `"appId": "cli_verify_placeholder"` and `"appSecret": "****"`, stderr shows `OK: Configuration saved to …/config.json`.
- **Side effect.** Run `$S run config show --offline -- config show`. Exit `0`; stdout has `"appId": "cli_verify_placeholder"`, `"appSecret": "****"`, `"users": "(no logged-in users)"`. `show.fs.txt` lists `./.lark-cli/config.json`, `./.local/share/lark-cli/appsecret_cli_verify_placeholder.enc`, and `./.local/share/lark-cli/master.key` — the secret is in the encrypted store, not the config file.
- **Bot-only status.** Run `$S run config status --offline -- auth status`. Exit `0`; stdout has `"identity": "bot"` and `"note": "No user logged in. Only bot (tenant) identity is available for API calls. …"`.
- **Scope check.** Run `$S run config check --offline -- auth check --scope im:message`. Exit `1`; stdout has `"ok": false`, `"error": "not_logged_in"`, `"missing": ["im:message"]`.
- **User list.** Run `$S run config list --offline -- auth list`. Exit `0`; stdout is `No logged-in users. Run \`lark-cli auth login\` to log in.`
- **Doctor.** Run `$S run config doctor --offline -- doctor --offline`. Exit `1`; checks show `config_file: pass`, `app_resolved: pass` (`app: cli_verify_placeholder (feishu)`), `token_exists: fail` (`no user logged in`), `endpoint_open`/`endpoint_mcp: skip`.
- **Proof.** `$EVIDENCE_DIR/config/` holds the before (`*-empty`) and after labels, so the transition from not-configured to bot-only is visible from read-only views.

## Gotchas

- `auth login` (all forms, including `--no-wait` and `--device-code`), `config init --new`, and interactive `config init` require a human to complete a browser flow, and a real app. With the placeholder app, `auth login --domain calendar --no-wait` fails with exit `3` (`device authorization failed`) once it reaches `accounts.feishu.cn`. Logged-in states (`token_exists: pass`, user identity, granted scopes) are unverifiable here; report them as blocked on credentials.
- `auth scopes` and non-offline `doctor` contact Feishu. Under `--offline` `auth scopes` exits `1` with `"type": "permission"` and a DNS error; with the placeholder app online it would fail on the fake app ID. Neither proves anything about scopes.
- `doctor --offline` exits `1` whenever any check fails, including the expected `token_exists` failure. Assert on individual checks, not the exit code alone.
- The keychain on Linux follows `HOME` (`$HOME/.local/share/lark-cli`), not `LARKSUITE_CLI_CONFIG_DIR`. Setting only the config dir would read or write the real user's secrets.
- `config init` replaces the single saved app; re-running it in the same sandbox is not a multi-app test.
