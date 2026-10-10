# Phase prompts

Paste one body into a Claude Code session at the project root. The header of each file names its preconditions and the text to paste.

Each prompt comes in two sets with the same file names:

- `auto/` runs the prescribed session flow. It has no slot for your input.
- `steered/` starts with a `<request>` slot. Replace the slot with your request or steering before you paste. Your request outranks the rest of the body, but `Intent` outranks your request.

Use `steered/resume.md` to name the next work and its end point. Use `steered/maintain.md` for a specific request or for named `.agent/deferred.md` rows. `auto/maintain.md` works every row.

Start each fresh session with this command. Replace `<gpt-model>` with the GPT model for the teammates. Replace `<level>` with the effort level that you choose for the session.

```sh
CLAUDE_CODE_SUBAGENT_MODEL=<gpt-model> ANTHROPIC_MODEL=claude-opus-5-5 headroom wrap claude --1m --code-memory none --effort <level>
```

Always set `CLAUDE_CODE_SUBAGENT_MODEL`, because no settings file sets the teammate model. Choose the model and the effort level for the phase:

- PROTOTYPE and ITERATE use many small teammates in parallel. Choose a cheap model and a low effort level. For design choices such as the UI, these phases build several different variants, including at least one unconventional idea. You compare the variants and pick one or combine them.
- IMPLEMENT and MAINTAIN use teammates wherever they make the work more correct. These phases also do more research on state-of-the-art methods. Choose a strong model and a high effort level.

| Situation | File | Use |
| --- | --- | --- |
| Start PROTOTYPE | `prototype.md` | Write your `Intent` in `.agent/spec.md` first. In a shipped repo, also name the scope in `Phase`. |
| Start ITERATE | `iterate.md` | When PROTOTYPE closes, paste it. The session runs until you say go. |
| Start IMPLEMENT | `implement.md` | After you say go, paste it. It can also open a new scope directly at IMPLEMENT. |
| MAINTAIN | `maintain.md` | Paste one body per request, queue run, security review or dependency upgrade. |
| Continue open work in any phase | `resume.md` | Paste in a fresh session after a pause, a crash or a restart. |
| Stop now and continue later | `pause.md` | Paste into the running session. |
| Repo on an older template | `refresh.md` | Copy `CLAUDE.project.md` over `CLAUDE.md` first. The session does the migration and nothing else. |

- A phase applies to a scope: the whole product, or one surface or feature of a shipped repo.
- The template sets default structures, for example the prototype location, CI and the review ledger. A rule in `.claude/rules/` can adapt or retire one of them for a repo, and every prompt follows that rule.
- Teammates run at the effort level of the session.
- The agent works on a body until its `Met when` condition holds. It asks you questions whenever your input can improve the work, and it continues after you answer.
- `AskUserQuestion` holds the run until you answer. The Notification hook emails each pending question.
- To continue an interrupted run in the same session, send `continue`. In a fresh session, paste `resume.md`.
- `pause.md` writes a resume note into `.agent/spec.md`, and `resume.md` removes it when the work is complete. While the note is open, the statusline shows the phase in purple.

## Advisor

The advisor lets the agent consult Fable 5.1 while it works. Each consultation uses part of your Fable usage limit. The advisor is off until you turn it on.

- To use the advisor for one session, add `--advisor claude-fable-5-1` to the start command. Put `CLAUDE_CODE_FOOTER_INDICATOR=adv` in front of the command. The footer then shows `◆ adv`.
- To turn on the advisor from inside a session, send `/advisor claude-fable-5-1` as a message of its own. Then paste the body in a new message. This setting also applies to new sessions until you send `/advisor off`.

Claude Code reads a whole message that starts with `/advisor` as the advisor model name. Thus, a body in the same message does not get to the agent.

The transcript can keep the advice in encrypted form. For this reason, the final message restates each consultation and the decision of the agent.
