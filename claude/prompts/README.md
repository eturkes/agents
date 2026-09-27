# Phase prompts

Paste one body into a fresh Claude Code session at the project root. The header of each file names its preconditions and the text to paste.

Start each session at the effort level of its phase:

```sh
ANTHROPIC_MODEL=claude-opus-5-5 headroom wrap claude --1m --code-memory none --effort <level>
```

| Phase | File | Effort | Use |
| --- | --- | --- | --- |
| PROTOTYPE | `prototype.md` | `medium` | Write your `Intent` in `.agent/spec.md` first. |
| ITERATE | none | `medium` | Work in interactive sessions until you say go. |
| IMPLEMENT | `implement.md` | `xhigh` | Paste after you say go. |
| MAINTAIN | `maintain.md` | `xhigh` | Paste one body per request. |
| Roadmap-flow repo → phase flow | `migrate.md` | `xhigh` | Copy `CLAUDE.project.md` over `CLAUDE.md` first. |
| Phase-flow repo on an older template | `refresh.md` | `xhigh` | Copy `CLAUDE.project.md` over `CLAUDE.md` first. The session does the migration and nothing else. |

- Teammates run at the effort level of the session.
- The agent works on a phase body until its `Met when` condition holds. It asks you questions whenever your input can improve the work, and it continues after you answer.
- `AskUserQuestion` holds the run until you answer. The Notification hook emails each pending question.
- To continue an interrupted run, send `continue`. In a fresh session, paste the same body again. The agent reorients from `.agent/spec.md` and `git log`.
