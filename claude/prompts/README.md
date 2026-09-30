# Phase prompts

Paste one body into a Claude Code session at the project root. The header of each file names its preconditions and the text to paste.

Start each fresh session with this command. Replace `<level>` with the effort level that you choose for the session.

```sh
ANTHROPIC_MODEL=claude-opus-5-5 headroom wrap claude --1m --code-memory none --effort <level>
```

| Situation | File | Use |
| --- | --- | --- |
| Start PROTOTYPE | `prototype.md` | Write your `Intent` in `.agent/spec.md` first. In a shipped repo, also name the scope in `Phase`. |
| ITERATE | `resume.md` | Paste it to open each session. The phase moves on when you say go. |
| Start IMPLEMENT | `implement.md` | Paste after you say go, or to open a new scope directly at IMPLEMENT. |
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

## Advisor

The advisor lets the agent consult Fable 5.1 while it works. Each consultation uses part of your Fable usage limit. The advisor is off until you turn it on.

- To use the advisor for one session, add `--advisor claude-fable-5-1` to the start command. Put `CLAUDE_CODE_FOOTER_INDICATOR=adv` in front of the command. The footer then shows `◆ adv`.
- To turn on the advisor from inside a session, send `/advisor claude-fable-5-1` as a message of its own. Then paste the body in a new message. This setting also applies to new sessions until you send `/advisor off`.

Claude Code reads a whole message that starts with `/advisor` as the advisor model name. Thus, a body in the same message does not get to the agent.

The transcript can keep the advice in encrypted form. For this reason, the final message restates each consultation and the decision of the agent.
