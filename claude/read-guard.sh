# shellcheck shell=bash
# Route file operands to Claude Code Read. Read bytes = lossless + reclaimable;
# Bash output = lossy + persistent in context.
#
# ~/.profile source ⇒ functions enter Claude Code's login-shell snapshot beside
# find/grep/pkill shadows. Define globally; CLAUDECODE call-time gate keeps human
# shells native because snapshot capture precedes agent session start.
#
# Existing path operand ⇒ refusal + Read guidance. Stdin pipeline ⇒ native
# head/tail.
#
# Letter-prefixed helper survives snapshot capture. Wrappers fall back to native
# commands when helper lookup misses.

cc_read_guard() {
  local _name=$1
  shift

  case "${CLAUDECODE:-}" in
    "") command "$_name" ${1+"$@"}; return ;;
  esac

  local _a _skip=""
  for _a in ${1+"$@"}; do
    # -n/-c consume next arg; skip value to classify path operands correctly.
    if [ -n "$_skip" ]; then _skip=""; continue; fi
    case "$_a" in
      -n|-c|--lines|--bytes) _skip=1 ;;
      -*) ;;
      *)
        if [ -e "$_a" ]; then
          # Literal backticks/%s belong to printf format.
          # shellcheck disable=SC2016
          printf '%s: refusing to read %s — use the Read tool (offset/limit cover `%s -n N`). Piped input is fine; `command %s` bypasses.\n' \
            "$_name" "$_a" "$_name" "$_name" >&2
          return 1
        fi
        ;;
    esac
  done

  command "$_name" ${1+"$@"}
}

head() { if command -v cc_read_guard >/dev/null 2>&1; then cc_read_guard head ${1+"$@"}; else command head ${1+"$@"}; fi; }
tail() { if command -v cc_read_guard >/dev/null 2>&1; then cc_read_guard tail ${1+"$@"}; else command tail ${1+"$@"}; fi; }
