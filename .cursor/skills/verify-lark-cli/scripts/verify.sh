#!/usr/bin/env bash
# Verification harness for lark-cli. See ../SKILL.md for the full recipe.
#
#   eval "$(verify.sh launch)"            build ./lark-cli, create an isolated run, export RUN_ID/RUN_DIR/EVIDENCE_DIR
#   verify.sh doctor                      read-only: is this run's binary + sandbox worth driving?
#   verify.sh placeholder-app             write a fake, offline-only app config into the run sandbox
#   verify.sh run <feature> <label> [--offline] -- <lark-cli args...>
#                                         drive the binary, capture cmd/stdout/stderr/exit/fs into EVIDENCE_DIR
#   verify.sh cleanup                     remove the sandbox and build outputs this run created; keep evidence
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$SKILL_DIR/../../.." && pwd)"
BIN="$REPO/lark-cli"
EVIDENCE_ROOT="${LARK_VERIFY_EVIDENCE_ROOT:-$REPO/artifacts/verify-lark-cli}"
PLACEHOLDER_APP_ID="cli_verify_placeholder"

die() { echo "verify.sh: $*" >&2; exit 1; }

require_run() {
  [[ -n "${RUN_ID:-}" ]] || die "RUN_ID not set; run: eval \"\$(verify.sh launch)\""
  RUN_DIR="/tmp/lark-cli-verify-$RUN_ID"
  EVIDENCE_DIR="$EVIDENCE_ROOT/$RUN_ID"
  [[ -f "$RUN_DIR/state" ]] || die "no run state at $RUN_DIR/state (launched? already cleaned up?)"
}

sandbox_env() {
  env -i PATH="$PATH" TERM=dumb NO_COLOR=1 \
    HOME="$RUN_DIR/home" \
    LARKSUITE_CLI_CONFIG_DIR="$RUN_DIR/home/.lark-cli" \
    LARKSUITE_CLI_REMOTE_META="${LARKSUITE_CLI_REMOTE_META:-off}" \
    "$@"
}

cmd_launch() {
  local run_id="${RUN_ID:-$(date +%Y%m%d-%H%M%S)-$$}"
  local run_dir="/tmp/lark-cli-verify-$run_id"
  [[ ! -e "$run_dir" ]] || die "$run_dir already exists; pick a new RUN_ID or clean it up"
  mkdir -p "$run_dir/home"

  local had_bin=0 had_meta=0
  [[ -e "$BIN" ]] && had_bin=1
  [[ -e "$REPO/internal/registry/meta_data.json" ]] && had_meta=1

  (cd "$REPO" && make build) >"$run_dir/build.log" 2>&1 || { cat "$run_dir/build.log" >&2; die "make build failed (log: $run_dir/build.log)"; }

  cat >"$run_dir/state" <<EOF
had_bin=$had_bin
had_meta=$had_meta
expected_version=$(cd "$REPO" && git describe --tags --always --dirty 2>/dev/null || echo dev)
EOF
  mkdir -p "$EVIDENCE_ROOT/$run_id"
  cp "$run_dir/build.log" "$EVIDENCE_ROOT/$run_id/build.log"
  echo "export RUN_ID=$run_id"
  echo "export RUN_DIR=$run_dir"
  echo "export EVIDENCE_DIR=$EVIDENCE_ROOT/$run_id"
  echo "verify.sh: ready: $BIN built, sandbox HOME=$run_dir/home" >&2
}

cmd_doctor() {
  require_run
  # shellcheck disable=SC1091
  source "$RUN_DIR/state"
  local ok=1
  check() { if eval "$2"; then echo "pass  $1"; else echo "FAIL  $1${3:+ ($3)}"; ok=0; fi; }

  check binary "[[ -x '$BIN' ]]" "$BIN missing; re-run launch"
  local got
  got="$(sandbox_env "$BIN" --version 2>/dev/null | awk '{print $NF}')" || true
  check version "[[ '$got' == '$expected_version' ]]" "binary=$got expected=$expected_version"
  local newer
  newer="$(find "$REPO/cmd" "$REPO/internal" "$REPO/shortcuts" "$REPO/main.go" -name '*.go' -newer "$BIN" -print -quit 2>/dev/null)"
  check fresh-build "[[ -z '$newer' ]]" "source newer than binary: $newer; re-run launch"
  check sandbox-home "[[ -d '$RUN_DIR/home' && '$RUN_DIR/home' != \"\$HOME\" ]]"
  check unshare-netns "unshare -rn true 2>/dev/null" "--offline drives unavailable; network isolation cannot be proven"
  echo "--- lark-cli doctor --offline (sandbox) ---"
  sandbox_env "$BIN" doctor --offline || true
  echo "--- lark-cli auth status (sandbox) ---"
  sandbox_env "$BIN" auth status || true
  [[ $ok == 1 ]]
}

cmd_placeholder_app() {
  require_run
  printf 'verify-placeholder-not-a-secret' |
    cmd_run setup placeholder-app --offline -- config init --app-id "$PLACEHOLDER_APP_ID" --app-secret-stdin
}

cmd_run() {
  require_run
  local feature="${1:-}" label="${2:-}"
  [[ -n "$feature" && -n "$label" ]] || die "usage: verify.sh run <feature> <label> [--offline] -- <lark-cli args...>"
  shift 2
  local wrap=() net=host
  if [[ "${1:-}" == "--offline" ]]; then
    unshare -rn true 2>/dev/null || die "--offline requested but 'unshare -rn' is unavailable"
    wrap=(unshare -rn) net="none (unshare -rn)"; shift
  fi
  [[ "${1:-}" == "--" ]] || die "missing -- before lark-cli args"
  shift

  local out="$EVIDENCE_DIR/$feature"
  mkdir -p "$out"
  local rc=0
  set +e
  sandbox_env "${wrap[@]}" "$BIN" "$@" >"$out/$label.stdout" 2>"$out/$label.stderr"
  rc=$?
  set -e
  printf '%s\n' "${wrap[*]:+${wrap[*]} }lark-cli $(printf '%q ' "$@")" >"$out/$label.cmd"
  echo "$rc" >"$out/$label.exit"
  (cd "$RUN_DIR/home" && find . -type f | sort) >"$out/$label.fs.txt"
  {
    echo "## $feature / $label"
    echo
    echo '```'
    echo "\$ $(cat "$out/$label.cmd")"
    echo "# exit=$rc  network=$net  build=$(sandbox_env "$BIN" --version | awk '{print $NF}')"
    echo "# --- stdout ---"; cat "$out/$label.stdout"
    echo "# --- stderr ---"; cat "$out/$label.stderr"
    echo "# --- sandbox files after ---"; cat "$out/$label.fs.txt"
    echo '```'
    echo
  } >>"$EVIDENCE_DIR/transcript.md"
  echo "exit=$rc evidence=$out/$label.*"
  return "$rc"
}

cmd_cleanup() {
  require_run
  # shellcheck disable=SC1091
  source "$RUN_DIR/state"
  [[ $had_bin == 0 ]] && rm -f "$BIN"
  [[ $had_meta == 0 ]] && rm -f "$REPO/internal/registry/meta_data.json"
  case "$RUN_DIR" in /tmp/lark-cli-verify-?*) rm -rf "$RUN_DIR" ;; *) die "refusing to remove $RUN_DIR" ;; esac
  echo "verify.sh: cleaned $RUN_DIR; evidence kept at $EVIDENCE_DIR" >&2
  ls -la "$EVIDENCE_DIR"
}

case "${1:-}" in
  launch) shift; cmd_launch "$@" ;;
  doctor) shift; cmd_doctor "$@" ;;
  placeholder-app) shift; cmd_placeholder_app "$@" ;;
  run) shift; cmd_run "$@" ;;
  cleanup) shift; cmd_cleanup "$@" ;;
  *) sed -n '2,10p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
