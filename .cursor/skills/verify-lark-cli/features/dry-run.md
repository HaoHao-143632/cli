# Dry-run previews

Before running a command with side effects, a user adds `--dry-run` to see the exact HTTP request(s) the CLI would send — method, URL, query params, body, app and identity — without sending anything. It works for shortcuts (`+name`), generated API commands, and raw `lark-cli api` calls.

## Sub-features

- `dry-shortcut` previews a shortcut request (e.g. `im +messages-send`, `calendar +create`, `calendar +agenda`).
- `dry-mcp-shortcut` previews a docs shortcut that targets the MCP endpoint (`docs +create`).
- `dry-service` previews a generated API command (`calendar calendars list`).
- `dry-raw-api` previews a raw `api` call with `--params` and `--data`.
- `dry-validation` still enforces flag validation under `--dry-run`.
- `dry-config-gate` refuses to preview when no app is configured.

## How to get to it (user POV)

- Append `--dry-run` to any shortcut, e.g. `lark-cli im +messages-send --chat-id oc_xxx --text "hello" --dry-run`.
- Append `--dry-run` to a generated command, e.g. `lark-cli calendar calendars list --dry-run`.
- Append `--dry-run` to `lark-cli api <METHOD> <path> ...`.

## Driving it with verify.sh

Preconditions:

- Baseline launch and doctor done.
- For `dry-config-gate`, the sandbox is fresh (no `config.json`). For everything else, run `$S placeholder-app` first; stdout shows `OK: Configuration saved to …/config.json` and `"appId": "cli_verify_placeholder"`.

- **Config gate.** In a fresh sandbox run `$S run dry-run no-config --offline -- im +messages-send --chat-id oc_test --text hi --dry-run`. Exit `2`; stderr has `"identity": "bot"`, `"type": "config"`, `"message": "not configured"`.
- **Shortcut send.** After `$S placeholder-app`, run `$S run dry-run im-send --offline -- im +messages-send --chat-id oc_test --text hi --dry-run`. Exit `0`; stderr is `=== Dry Run ===`; stdout JSON has `"method": "POST"`, `"url": "/open-apis/im/v1/messages"`, `"params": {"receive_id_type": "chat_id"}`, and a body with `"receive_id": "oc_test"`, `"msg_type": "text"`, `"content": "{\"text\":\"hi\"}"`.
- **Shortcut create event.** Run `$S run dry-run calendar-create --offline -- calendar +create --summary "Verify" --start "2026-11-05T10:00:00+08:00" --end "2026-11-05T11:00:00+08:00" --dry-run`. Exit `0`; stdout has `"method": "POST"`, a URL ending `/calendars/%3Cprimary%3E/events`, and `"end_time": {"timestamp": "1793847600"}`.
- **MCP shortcut.** Run `$S run dry-run docs-create --offline -- docs +create --title "Verify" --markdown "# hi" --dry-run`. Exit `0`; stdout has `"url": "https://mcp.feishu.cn/mcp"`, `"mcp_tool": "create-doc"`, and `"args": {"markdown": "# hi", "title": "Verify"}`.
- **Generated command.** Run `$S run dry-run calendars-list --offline -- calendar calendars list --dry-run`. Exit `0`; stdout has `"method": "GET"`, `"url": "/open-apis/calendar/v4/calendars"`, `"appId": "cli_verify_placeholder"`, `"as": "bot"`.
- **Raw API.** Run `$S run dry-run api-post --offline -- api POST /open-apis/im/v1/messages --params '{"receive_id_type":"chat_id"}' --data '{"receive_id":"oc_test","msg_type":"text","content":"{\"text\":\"hi\"}"}' --dry-run`. Exit `0`; stdout echoes the same method, URL, params, and body, plus `"appId"` and `"as": "bot"`.
- **Validation still applies.** Run `$S run dry-run missing-target --offline -- im +messages-send --text hi --dry-run`. Exit `2`; stderr has `"type": "validation"`, `"message": "specify at least one of --chat-id or --user-id"`.
- **Proof.** Every passing label above has exit `0` with `network=none (unshare -rn)` in `transcript.md`: the request was rendered with no network interface available, so nothing was sent. `.fs.txt` lists only the placeholder config files, showing no other local writes.

## Gotchas

- `--dry-run` needs a configured app even though nothing is sent. Use `$S placeholder-app`; never invent or paste real credentials.
- **Never drop `--dry-run` with the placeholder app.** A real call is not offline: `calendar +agenda` without `--dry-run` sends the fake app ID to `open.feishu.cn` and fails with `API call failed: msg:invalid param,code:10003`. Run every dry-run with `--offline` so a regression that starts sending would fail with exit `4`.
- User-only identities are gated before the preview: `calendar +agenda --as user --dry-run` exits `3` with `"message": "not logged in"`. Use the default (bot) identity for offline previews; user-identity previews need a real login.
- The `=== Dry Run ===` banner is on stderr, and its order relative to stdout varies; assert on each stream separately.
- `--format pretty` is not available on every shortcut: `im +messages-send ... --dry-run --format pretty` exits `1` with `Error: unknown flag: --format`.
- `calendar +agenda --dry-run` computes today's time window, so `start_time`/`end_time` change every day; do not pin them.
