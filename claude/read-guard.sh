#!/usr/bin/env bash
# Route file contents to Claude Code's Read tool, which Headroom excludes from
# lossy compression and reclaims once stale/superseded; Bash output is a
# designated compression target that is never reclaimed.
#
# Sourced from ~/.profile so the definitions land in the login shell Claude Code
# snapshots for every Bash call, alongside its own find/grep/pkill shadows.
# Defined unconditionally and gated at call time on CLAUDECODE, so an
# interactive human shell keeps plain head/tail even though the snapshot that
# captures these functions is generated before the agent session begins.
#
# Only the file-reading form is refused. `cmd | head -N` and `cmd | tail -N`
# read stdin, carry no file bytes into context, and pass straight through.
#
# The helper name must start with a letter: Claude Code's snapshot drops an
# underscore-prefixed helper while capturing the wrappers, which would then call
# a missing function. The wrappers also fall back to `command <name>` whenever
# the helper is absent, so pipelines keep working under any snapshot miss.

cc_read_guard() {
  local _name=$1
  shift

  case "${CLAUDECODE:-}" in
    "") command "$_name" ${1+"$@"}; return ;;
  esac

  local _a _skip=""
  for _a in ${1+"$@"}; do
    # -n/-c take a separate value; skip it so a file named e.g. `20` in the
    # working directory cannot be mistaken for a path operand.
    if [ -n "$_skip" ]; then _skip=""; continue; fi
    case "$_a" in
      -n|-c|--lines|--bytes) _skip=1 ;;
      -*) ;;
      *)
        if [ -e "$_a" ]; then
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
