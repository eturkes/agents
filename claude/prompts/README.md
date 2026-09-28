# Phase prompts

Paste one body into a fresh Claude Code session at the project root. The header of each file names its preconditions and the text to paste.

Start each session with this command. Replace `<level>` with the effort level that you choose for the session.

```sh
ANTHROPIC_MODEL=claude-opus-5-5 headroom wrap claude --1m --code-memory none --effort <level>
```

| Phase | File | Use |
| --- | --- | --- |
| PROTOTYPE | `prototype.md` | Write your `Intent` in `.agent/spec.md` first. |
| ITERATE | none | Work in interactive sessions until you say go. |
| IMPLEMENT | `implement.md` | Paste after you say go. |
| MAINTAIN | `maintain.md` | Paste one body per request. |
| Roadmap-flow repo → phase flow | `migrate.md` | Copy `CLAUDE.project.md` over `CLAUDE.md` first. |
| Phase-flow repo on an older template | `refresh.md` | Copy `CLAUDE.project.md` over `CLAUDE.md` first. The session does the migration and nothing else. |

- Teammates run at the effort level of the session.
- The agent works on a phase body until its `Met when` condition holds. It asks you questions whenever your input can improve the work, and it continues after you answer.
- `AskUserQuestion` holds the run until you answer. The Notification hook emails each pending question.
- To continue an interrupted run, send `continue`. In a fresh session, paste the same body again. The agent reorients from `.agent/spec.md` and `git log`.

## Advisor

The advisor lets the agent consult Fable 5.1 while it works. Each consultation uses part of your Fable usage limit. The advisor is off until you turn it on.

- To use the advisor for one session, add `--advisor claude-fable-5-1` to the start command.
- To turn on the advisor from inside a session, send `/advisor claude-fable-5-1` as a message of its own. Then paste the body in a new message. This setting also applies to new sessions until you send `/advisor off`.

Claude Code reads a whole message that starts with `/advisor` as the advisor model name. Thus, a body in the same message does not get to the agent.

The transcript can keep the advice in encrypted form. For this reason, the final message restates each consultation and the decision of the agent.
