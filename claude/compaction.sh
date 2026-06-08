#!/bin/sh
# Claude Code context gauge + rate limits.
# Branch on stdin content, NOT env: statusline pipes JSON (and sets CLAUDE_CODE_SESSION_ID, so the
# env var cannot distinguish modes). Stdin JSON => statusline; TTY/empty stdin => manual (read transcript).
j=""
[ -t 0 ] || j=$(cat)
u=$(printf '%s' "$j" | jq -r '.context_window.total_input_tokens // empty' 2>/dev/null)
if [ -n "$u" ]; then
  w=$(printf '%s' "$j" | jq -r '.context_window.context_window_size // empty' 2>/dev/null)
  sp=$(printf '%s' "$j" | jq -r '.rate_limits.five_hour.used_percentage // empty' 2>/dev/null)
  sr=$(printf '%s' "$j" | jq -r '.rate_limits.five_hour.resets_at // empty' 2>/dev/null)
  wp=$(printf '%s' "$j" | jq -r '.rate_limits.seven_day.used_percentage // empty' 2>/dev/null)
  wr=$(printf '%s' "$j" | jq -r '.rate_limits.seven_day.resets_at // empty' 2>/dev/null)
  tp=$(printf '%s' "$j" | jq -r '.transcript_path // empty' 2>/dev/null)
  pd=$(printf '%s' "$j" | jq -r '.workspace.project_dir // empty' 2>/dev/null)
  c=1
else
  f=$(ls "$HOME"/.claude/projects/*/"$CLAUDE_CODE_SESSION_ID".jsonl 2>/dev/null)
  [ -n "$f" ] || f=$(ls -t "$HOME"/.claude/projects/*/*.jsonl 2>/dev/null | head -1)
  u=$(jq -s 'map(select(.type=="assistant" and .isSidechain!=true and .message.model!="<synthetic>" and (.message.usage|type)=="object"))
    | if length>0 then (.[-1].message.usage|.input_tokens+.cache_creation_input_tokens+.cache_read_input_tokens) else empty end' "$f" 2>/dev/null)
  case $CLAUDE_CODE_DISABLE_1M_CONTEXT in 1|true|yes|on) w=200000 ;; *) w=1000000 ;; esac
  c=0
fi
[ "$w" -gt 0 ] 2>/dev/null || w=200000
# Rate-limit suffix; empty when rate_limits absent (manual mode, or before first API response).
# seg PCT EPOCH => "N% MM/DD HH:MM" (used%, reset time); N>=80 yellow, N>=90 red.
seg() {
  printf '%s %s' "$(awk -v p="$1" 'BEGIN{q=int(p+0.5)
    if(q>=90)printf "\033[31m%d%%\033[0m",q
    else if(q>=80)printf "\033[33m%d%%\033[0m",q
    else if(q>=50)printf "\033[32m%d%%\033[0m",q
    else printf "%d%%",q}')" "$(date -d "@$2" +'%m/%d %H:%M')"
}
rl=""
[ -n "$sp" ] && [ -n "$sr" ] && rl=" | 5h $(seg "$sp" "$sr")"
[ -n "$wp" ] && [ -n "$wr" ] && rl="$rl | 7d $(seg "$wp" "$wr")"
# "last" = turn-end time via transcript mtime: tracks ~now while a turn streams, freezes once idle.
# Idle >=15m green, >=30m yellow, >=45m red: escalating staleness as cache TTL burns down toward an uncached next turn.
te=$(stat -c %Y "$tp" 2>/dev/null) && [ -n "$te" ] && {
  ts="last $(date -d "@$te" +'%m/%d %H:%M')"
  idle=$(( $(date +%s) - te ))
  if [ "$idle" -ge 2700 ]; then ts=$(printf '\033[31m%s\033[0m' "$ts")
  elif [ "$idle" -ge 1800 ]; then ts=$(printf '\033[33m%s\033[0m' "$ts")
  elif [ "$idle" -ge 900 ]; then ts=$(printf '\033[32m%s\033[0m' "$ts")
  fi
  rl="$rl | $ts"
}
# Timezone column qualifying all timestamps, then launch-directory basename.
[ -n "$rl" ] && rl="$rl | $(date +%Z)"
[ -n "$rl" ] && [ -n "$pd" ] && rl="$rl | ${pd##*/}"
awk -v u="$u" -v w="$w" -v c="$c" -v r="$rl" '
function h(n){ if(n>=1000000){s=sprintf("%.1fM",n/1000000);sub(/\.0M$/,"M",s);return s}
              return sprintf("%dK",int(n/1000+0.5)) }
BEGIN{ if(u==""){ print "? ?/" h(w) r; exit }
       p=int(u*100/w+0.5); s=p "% " h(u) "/" h(w)
       if(c&&p>=80) s="\033[31m" s "\033[0m"; else if(c&&p>=60) s="\033[33m" s "\033[0m"; else if(c&&p>=40) s="\033[32m" s "\033[0m"
       print s r }'
