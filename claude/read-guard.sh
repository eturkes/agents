# shellcheck shell=bash
# Route oversized file dumps to Claude Code Read. Read bytes = lossless +
# reclaimable; Bash output = lossy + persistent in context.
#
# ~/.profile source ⇒ functions enter Claude Code's login-shell snapshot beside
# find/grep/pkill shadows. Define globally; CLAUDECODE call-time gate keeps human
# shells native because snapshot capture precedes agent session start.
#
# Output volume decides, never the command name. A refusal costs a turn AND the
# retry re-reads the same bytes through Read, so every call already inside the
# budget runs native: stdin pipelines, small operands, explicit `-n`/`-c` caps.
# Guard traffic measured against the blanket form: 86% of refused head/tail
# carried n<=100, and 66% of denied cat calls emitted nothing into context
# (heredoc writes, stdin, annotate flags).
#
# Redirection stays invisible to a shell function ⇒ `cat big > copy` reads as a
# dump; route those through `command cat`.
#
# Letter-prefixed helpers survive snapshot capture. Wrappers fall back to native
# commands when helper lookup misses.

CC_READ_MAX_BYTES=${CC_READ_MAX_BYTES:-4096}
CC_READ_MAX_LINES=${CC_READ_MAX_LINES:-100}

# <n|c> <value> ⇒ 0 when the flag caps output inside budget.
cc_read_bounded() {
  case $2 in ''|*[!0-9]*) return 1 ;; esac
  case $1 in
    n) [ "$2" -le "$CC_READ_MAX_LINES" ] ;;
    *) [ "$2" -le "$CC_READ_MAX_BYTES" ] ;;
  esac
}

cc_read_guard() {
  local _name=$1
  shift

  case "${CLAUDECODE:-}" in
    "") command "$_name" ${1+"$@"}; return ;;
  esac

  local _a _want="" _files="" _capped="" _bytes=0 _size
  for _a in ${1+"$@"}; do
    # -n/-c carry their value in the next arg; consume it before operand tests.
    if [ -n "$_want" ]; then
      cc_read_bounded "$_want" "$_a" && _capped=1
      _want=""
      continue
    fi
    case "$_name:$_a" in
      # Follow mode blocks until the tool timeout ⇒ operand size never clears it.
      tail:-*[fF]*|tail:--follow*) _bytes=$((CC_READ_MAX_BYTES + 1)) ;;
      # Every cat flag annotates a whole-file dump ⇒ operand size alone decides,
      # and -n/-b there number lines rather than cap them.
      cat:-*) ;;
      *:-n|*:--lines) _want=n ;;
      *:-c|*:--bytes) _want=c ;;
      *:--lines=*) cc_read_bounded n "${_a#--lines=}" && _capped=1 ;;
      *:--bytes=*) cc_read_bounded c "${_a#--bytes=}" && _capped=1 ;;
      *:-n*) cc_read_bounded n "${_a#-n}" && _capped=1 ;;
      *:-c*) cc_read_bounded c "${_a#-c}" && _capped=1 ;;
      *:-[0-9]*) cc_read_bounded n "${_a#-}" && _capped=1 ;;
      *:-*) ;;
      *)
        [ -e "$_a" ] || continue
        _files="$_files $_a"
        _size=""
        [ -f "$_a" ] && _size=$(command wc -c < "$_a" 2>/dev/null)
        case $_size in
          *[0-9]*) _bytes=$((_bytes + _size)) ;;
          # device/fifo/dir/unreadable ⇒ unmeasurable, so budget it as oversized
          *) _bytes=$((CC_READ_MAX_BYTES + 1)) ;;
        esac
        ;;
    esac
  done

  if [ -n "$_files" ] && [ -z "$_capped" ] && [ "$_bytes" -gt "$CC_READ_MAX_BYTES" ]; then
    # Literal backticks/%s belong to printf format.
    # shellcheck disable=SC2016
    printf '%s: read%s with the Read tool — lossless + reclaimable. Native here: stdin, operands <=%sB, `-n <=%s`, `-c <=%s`; `command %s` always.\n' \
      "$_name" "$_files" "$CC_READ_MAX_BYTES" "$CC_READ_MAX_LINES" "$CC_READ_MAX_BYTES" "$_name" >&2
    return 1
  fi

  command "$_name" ${1+"$@"}
}

cat() { if command -v cc_read_guard >/dev/null 2>&1; then cc_read_guard cat ${1+"$@"}; else command cat ${1+"$@"}; fi; }
head() { if command -v cc_read_guard >/dev/null 2>&1; then cc_read_guard head ${1+"$@"}; else command head ${1+"$@"}; fi; }
tail() { if command -v cc_read_guard >/dev/null 2>&1; then cc_read_guard tail ${1+"$@"}; else command tail ${1+"$@"}; fi; }
