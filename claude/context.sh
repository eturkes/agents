#!/bin/sh
# Context gauge → "N% used/window" (tokens) from the live Claude Code transcript = headroom.
# Window = 240K = the auto-compaction point (ACW 273K − 20K output reserve − 13K) = the number that ends a turn,
# so it denominates the gauge; the raw model window stays informational (`[1m]` id → 1M). CLI warn = 220K = 92%.
# A compaction-free implementation `Agent` runs a different budget: 252K effective, hard block 249K.
# Sums the last assistant turn's real API tokens (input+cache_creation+cache_read+output) = that request's
# occupancy floor for the NEXT turn — the dominant, authoritative headroom signal. It far exceeds the visible
# conversation: sys-prompt/tools/CLAUDE.md + injected reminders + prior-turn redacted extended-thinking ride in
# the cached input, none shown in the .jsonl. A high reading is REAL occupancy — genuine billed load rather than inflated accounting.
transcript_root="$HOME/.claude/projects"
f=$(find "$transcript_root" -mindepth 2 -maxdepth 2 -type f -name "$CLAUDE_CODE_SESSION_ID.jsonl" -print -quit 2>/dev/null)
# fallback (no session id): newest transcript in THIS project's dir only, scoped to this project alone
project_transcripts="$transcript_root/$(pwd -P | tr '/.' '-')"
[ -n "$f" ] || f=$(find "$project_transcripts" -maxdepth 1 -type f -name '*.jsonl' -printf '%T@ %p\n' 2>/dev/null | sort -nr | cut -d ' ' -f 2- | head -1)
u=$(jq -n 'last(inputs|select(.type=="assistant" and .isSidechain!=true and .message.model!="<synthetic>" and (.message.usage|type)=="object")|.message.usage|.input_tokens+.cache_creation_input_tokens+.cache_read_input_tokens+.output_tokens)//empty' "$f" 2>/dev/null)
w=240000
awk -v u="$u" -v w="$w" '
function h(n){ if(n>=1000000){s=sprintf("%.1fM",n/1000000);sub(/\.0M$/,"M",s);return s}
              return sprintf("%dK",int(n/1000+0.5)) }
BEGIN{ if(u==""){ print "? ?/" h(w); exit }
       print int(u*100/w+0.5) "% " h(u) "/" h(w) }'
