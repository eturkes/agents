# Phase prompts

Paste one body into a fresh Claude Code session at the project root. The header of each file names its preconditions and the text to paste.

| Phase | File | Use |
| --- | --- | --- |
| PROTOTYPE | `prototype.md` | Write your `Intent` in `.agent/spec.md` first. |
| ITERATE | none | Work in interactive sessions until you say go. |
| IMPLEMENT | `implement.md` | Paste after you say go. |
| MAINTAIN | `maintain.md` | Paste one body per request. |
| Roadmap-flow repo → phase flow | `migrate.md` | Copy `CLAUDE.project.md` over `CLAUDE.md` first. |

- The agent works on a phase body until its `Met when` condition holds. It ends its turn earlier only when it needs your input.
- `AskUserQuestion` holds the run until you answer. The Notification hook emails each pending question.
- To continue an interrupted run, send `continue`. In a fresh session, paste the same body again. The agent reorients from `.agent/spec.md` and `git log`.
