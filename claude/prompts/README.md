# Phase prompts

Paste one body into a fresh Claude Code session at the project root. Each file's header names its phase and its paste mechanics.

| Phase | File | Paste |
| --- | --- | --- |
| PROTOTYPE | `prototype.md` | `/goal ` + body; `.agent/spec.md` holds your `Intent` first |
| ITERATE | none | interactive sessions until you say go |
| IMPLEMENT | `implement.md` | `/goal ` + body |
| MAINTAIN | `maintain.md` | `/goal ` + one body per request |
| Roadmap-flow repo → phase flow | `migrate.md` | plain prompt |

- Type `/goal ` first, then paste the body. The paste shows as one collapsed block and submits with Enter. A body of up to 4000 characters fits the goal limit.
- `@path` mentions inside a `/goal` body attach nothing. Name the path, and the agent reads it. `CLAUDE.md` imports `.agent/spec.md` at session start, so the spec needs no mention. A plain prompt attaches each `@path` it names.
- A goal survives `--resume` and clears itself when the condition holds. `/goal clear` stops early. A context-limit or auth error also clears it: run `/goal` with the same body to continue.
- `AskUserQuestion` holds the run until you answer. The Notification hook emails each pending question.
