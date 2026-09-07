# Memory retirement

Paste at the project root, in a fresh Claude Code session. One pass per project.

Retire `.agent/memory.md` into `.claude/rules/`, which reaches MAIN and every teammate on its own. Global + project `CLAUDE.md` rules already apply — follow them rather than re-deriving them.

1. Read `.agent/memory.md`, `.agent/roadmap.md`, `.agent/polish.md`, and every existing `.claude/rules/*.md`. Absent `.agent/memory.md` ⇒ report state + stop.
2. Route every section of `.agent/memory.md` to exactly one destination:
   - project-wide law each role obeys — conventions, stack decisions, gate invocations, cross-cutting lessons → `.claude/rules/<topic>.md`, no frontmatter.
   - law bound to one code area — a module's contract, a library's quirk, a corpus's shape → `.claude/rules/<topic>.md` carrying `paths:`.
   - deferred improvement → `.agent/polish.md`, acceptance check + `pri` written now.
   - milestone or unit execution state → `.agent/roadmap.md`; closed-milestone detail → `.agent/archive/`.
   - superseded, re-derivable from the code, or true of any project → delete. Git history holds it.
3. `paths:` = a YAML list of quoted globs, repo-root-relative. Quote every pattern — a bare `*` or `[` opens a flow sequence and the field parses wrong or drops silently. Match the narrowest file set whose author needs the rule.
4. One topic = one file. Fold a section into the existing rules file that owns its topic rather than adding a near-duplicate. Keep the no-frontmatter tier small: it occupies MAIN's context and every teammate's, so anything area-bound earns `paths:`.
5. Verify one rule per tier. Bare tier → `claude -p` a question only that rule answers; a fresh session answers with zero tool calls. `paths:` tier → `Read` a matching file and confirm the rule arrives as a `<system-reminder>` on the tool result. That fires on the first matching touch per context, so re-verify a corrected rule from a fresh session.
6. Delete `.agent/memory.md`, then every reference to it in `.claude/commands/`, `CLAUDE.md`, and project docs. `rg -n 'memory\.md'` must return nothing.
7. One scoped commit.

Report: destination per section, the `paths:` globs chosen, what was deleted outright, bytes retired vs. added, and both tier verifications.
