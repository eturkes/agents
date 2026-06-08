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
rl=""
[ -n "$sp" ] && [ -n "$sr" ] && rl=" | 5h $(awk -v p="$sp" 'BEGIN{l=100-p;printf "%d",(l<0?0:l)+0.5}')% left, resets $(date -d "@$sr" +'%-d %b %H:%M')"
[ -n "$wp" ] && [ -n "$wr" ] && rl="$rl | 7d $(awk -v p="$wp" 'BEGIN{l=100-p;printf "%d",(l<0?0:l)+0.5}')% left, resets $(date -d "@$wr" +'%-d %b %H:%M')"
awk -v u="$u" -v w="$w" -v c="$c" -v r="$rl" '
function h(n){ if(n>=1000000){s=sprintf("%.1fM",n/1000000);sub(/\.0M$/,"M",s);return s}
              return sprintf("%dK",int(n/1000+0.5)) }
BEGIN{ if(u==""){ print "? ?/" h(w) r; exit }
       p=int(u*100/w+0.5); s=p "% " h(u) "/" h(w)
       if(c&&p>=80) s="\033[31m" s "\033[0m"; else if(c&&p>=60) s="\033[33m" s "\033[0m"
       print s r }'
