# Schema introspection

A user (usually an AI agent) inspects any Feishu Open API method before calling it: its HTTP method and path, parameters, request body, supported identities, required scopes, and docs link. It works without configuration or network.

## Sub-features

- `schema-list` lists available services.
- `schema-service` shows every resource and method of one service.
- `schema-resource` shows the methods of one resource.
- `schema-method` shows one method's full spec as JSON.
- `schema-pretty` renders a method or service for humans with `--format pretty`.
- `schema-unknown` rejects unknown services/methods with a hint listing valid names.

## How to get to it (user POV)

- Run `lark-cli schema`.
- Run `lark-cli schema <service>`, `lark-cli schema <service>.<resource>`, or `lark-cli schema <service>.<resource>.<method>`.
- Add `--format pretty` for human-readable output.

## Driving it with verify.sh

Preconditions:

- Baseline launch and doctor done; sandbox may be fresh (no config needed).

- **List services.** Run `$S run schema list --offline -- schema`. Exit `0`; stdout contains `Available services:` and the names `calendar`, `im`, `drive`, `task`, `wiki`, followed by `Usage: lark-cli schema <service>.<resource>.<method>`.
- **Method spec (JSON).** Run `$S run schema method-json --offline -- schema im.messages.delete`. Exit `0`; stdout is a JSON object with `"httpMethod": "DELETE"`, `"id": "messages.delete"`, `"danger": true`, `"parameterOrder": ["message_id"]`, and a `docUrl` under `https://open.feishu.cn/document/`.
- **Method spec (pretty).** Run `$S run schema method-pretty --offline -- schema im.messages.delete --format pretty`. Exit `0`; stdout contains `DELETE /open-apis/im/v1/messages/{message_id}`, `Identity: bot, user`, `Scopes:   im:message:recall, im:message, im:message:send_as_bot`, and `CLI:      lark-cli im messages delete`.
- **Service.** Run `$S run schema service --offline -- schema calendar --format pretty`. Exit `0`; stdout starts with `calendar (v4)` and shows `Base path: /open-apis/calendar/v4` and a `calendars` block with `GET list`.
- **Resource.** Run `$S run schema resource --offline -- schema calendar.calendars`. Exit `0`; stdout is JSON whose top-level key is `"methods"` and includes `"create"`.
- **Unknown service.** Run `$S run schema unknown-service --offline -- schema nope.x.y`. Exit `2`; stderr envelope has `"type": "validation"`, `"message": "Unknown service: nope"`, and a `hint` starting `Available: approval, attendance, calendar`.
- **Unknown method.** Run `$S run schema unknown-method --offline -- schema im.messages.create`. Exit `2`; stderr has `"message": "Unknown method: im.messages.create"` and a hint listing real methods such as `delete`, `forward`.
- **Proof.** `$EVIDENCE_DIR/schema/` holds each label's artifacts; `transcript.md` shows `network=none (unshare -rn)`, proving schema reads only the embedded registry.

## Gotchas

- `lark-cli schema` with no argument and every `--format pretty` view emit ANSI color codes even with `NO_COLOR=1` and a non-TTY stdout. Match on text with escapes stripped (e.g. `sed 's/\x1b\[[0-9;]*m//g'`) or use JSON output.
- Method IDs are `<service>.<resource>.<method>` from the registry, not the HTTP verb. `im.messages.create` does not exist; sending is a shortcut (`im +messages-send`).
- Some README examples (e.g. `calendar.events.instance_view`) may not exist in the registry version embedded at build time. A missing method is a registry-content fact; report it, do not swap in another method silently.
- With `LARKSUITE_CLI_REMOTE_META=on` and network, the CLI may refresh the registry into `$RUN_DIR/home/.lark-cli/cache/` and output can drift from the build-time data.
