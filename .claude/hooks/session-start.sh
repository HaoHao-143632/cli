#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

echo "session-start: downloading Go module dependencies..."
go mod download

echo "session-start: fetching API metadata (best-effort)..."
if python3 scripts/fetch_meta.py 2>/dev/null; then
  echo "session-start: fetched meta_data.json"
else
  echo "session-start: fetch_meta.py failed (network/API restricted); falling back to embedded meta_data_default.json (some tests requiring full metadata may fail)"
fi

echo "session-start: warming Go build cache..."
go build ./... >/dev/null

echo "session-start: done"
