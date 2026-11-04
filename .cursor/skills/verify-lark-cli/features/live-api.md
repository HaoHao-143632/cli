# Live API calls

A configured and logged-in user calls Feishu/Lark for real: shortcuts (`calendar +agenda`, `im +messages-send`), generated commands (`calendar calendars list`), and raw `lark-cli api GET /open-apis/...`. Results come back as JSON (or `--format table|pretty|ndjson|csv`). This is the CLI's core value and is credential-gated.

## Sub-features

- `live-read-bot` reads data with the tenant (bot) identity, e.g. `calendar calendars list`.
- `live-read-user` reads data with the user identity, e.g. `calendar +agenda --as user`.
- `live-raw-api` calls an arbitrary endpoint with `lark-cli api`.
- `live-write` performs a side-effecting call, e.g. `im +messages-send`.
- `live-no-creds` fails clearly when credentials are missing or invalid.

## How to get to it (user POV)

- Complete `lark-cli config init` with a real app, then `lark-cli auth login --recommend` in a browser.
- Run e.g. `lark-cli calendar +agenda`, `lark-cli calendar calendars list`, `lark-cli api GET /open-apis/calendar/v4/calendars`.

## Driving it with verify.sh

Preconditions:

- A real Feishu/Lark app ID and secret supplied by the user as secrets (e.g. Cloud Agent secrets `LARK_APP_ID` / `LARK_APP_SECRET`) and configured with `printf '%s' "$LARK_APP_SECRET" | $S run live config-init -- config init --app-id "$LARK_APP_ID" --app-secret-stdin`. Never print the secret or commit it; evidence files must not contain it.
- For `live-read-user`, a human completed `auth login` for this sandbox (run `$S run live login -- auth login --domain calendar --no-wait`, hand the verification URL to the user, then `$S run live login-poll -- auth login --device-code <code>`).
- These are not available in this repository's default agent environment; without them every journey below is **blocked**, not passed.

- **Bot read.** Run `$S run live calendars-list -- calendar calendars list`. Exit `0`; stdout JSON lists calendars. Confirm with a second view: `$S run live calendars-list-raw -- api GET /open-apis/calendar/v4/calendars` returns the same calendar IDs.
- **User read.** Run `$S run live agenda-user -- calendar +agenda --as user`. Exit `0`; stdout lists today's events for the logged-in user.
- **Write (only with an explicit test chat from the user).** Run `$S run live send -- im +messages-send --chat-id <test chat> --text "lark-cli verify $RUN_ID"`. Exit `0`; stdout contains a `message_id`. Second view: `$S run live send-check -- im +chat-messages-list --chat-id <test chat>` shows the text. Recall afterwards with `im messages delete`.
- **No credentials (placeholder app, network on).** After `$S placeholder-app`, run `$S run live agenda-placeholder -- calendar +agenda`. Observed: exit `1`, stderr `"type": "api_error"`, `"message": "API call failed: msg:invalid param,code:10003"`.
- **No credentials, raw API.** Run `$S run live api-placeholder -- api GET /open-apis/calendar/v4/calendars`. Observed: exit `4` with empty stdout and stderr.
- **Proof.** For passes, `$EVIDENCE_DIR/live/` holds the call and its second view with `network=host`. For blocked runs, report the missing precondition and attach the `*-placeholder` artifacts as the observed failure.

## Gotchas

- No real credentials exist in this environment; do not fabricate app IDs, secrets, tokens, chat IDs, or `--device-code` values. The placeholder app is for dry-run only, and live calls with it do reach `open.feishu.cn`.
- `lark-cli api` swallows token/network errors: it exits `4` and prints nothing to either stream. Rely on the exit code, and do not read an empty stderr as success.
- Shortcuts default to `--as bot` when no user is logged in; `--as user` without login exits `3` (`not logged in`).
- Write journeys hit a real tenant. Only run them against a chat/calendar the user named for testing, and undo them (recall the message, delete the event) before cleanup.
- `doctor` without `--offline` probes the Open API and MCP endpoints over the network; use it as an extra liveness check once real credentials are in place.
