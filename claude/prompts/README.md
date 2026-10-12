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

- In PROTOTYPE and ITERATE, the agent gives separate parts of the work to small teammates that run in parallel. Choose a cheap model and a low effort level. For design choices such as the UI, these phases build several different variants, including at least one unconventional idea. You compare the variants and pick one or combine them.
- In IMPLEMENT, the agent uses teammates wherever they can make the work more correct. This phase also does more research on state-of-the-art methods. Choose a strong model and a high effort level.
- In MAINTAIN, the agent does most of the work alone. One reviewer usually checks the complete change. Other teammates join only when the work needs them. Choose a strong model and a high effort level.

| Situation | File | Use |
| --- | --- | --- |
| Start PROTOTYPE | `prototype.md` | Write your `Intent` in `.agent/spec.md` first. In a shipped repo, also name the scope in `Phase`. After a route, `Phase` already names it. |
| Start ITERATE | `iterate.md` | When PROTOTYPE closes or after a route, paste it. The session runs until you say go. |
| Start IMPLEMENT | `implement.md` | After you say go or after a route, turn on the advisor. Then paste it. It can also open a new scope directly at IMPLEMENT. |
| MAINTAIN | `maintain.md` | Paste one body per request, queue run, security review or dependency upgrade. |
| Move work to another phase | `route.md` | Make your request in any session, or paste this body after it. |
| Continue open work in any phase | `resume.md` | Paste in a fresh session after a pause, a crash or a restart. |
| Stop now and continue later | `pause.md` | Paste into the running session. |
| Repo on an older template | `refresh.md` | Copy `CLAUDE.project.md` over `CLAUDE.md` first. The session does the migration and nothing else. |

- A phase applies to a scope: the whole product, or one surface or feature of a shipped repo.
- Work can move to any phase, also back to an earlier one. For example, a large MAINTAIN request moves to IMPLEMENT. Several sessions of work on a demo UI move to ITERATE. A rework of the whole product moves to PROTOTYPE.
- Before a route, the agent asks you to confirm it, unless your request names the phase. The session then saves the open work in commits, sets up the next phase and ends. Its final message names the body for the next session.
- To skip this extra session, paste the steered body of the target phase into a fresh session. Put your request in its slot.
- Open work that a route leaves is suspended in `Tasks`. It continues after the routed work, or joins it when both reach the same phase.
- ITERATE on a surface that exists only as shipped code works on a copy. After your go, IMPLEMENT re-implements the approved changes in the shipped code.
- The template sets default structures, for example the prototype location, CI and the review ledger. A rule in `.claude/rules/` can adapt or retire one of them for a repo, and every prompt follows that rule.
- Teammates run at the effort level of the session.
- The agent decides when to use a teammate or the advisor. The phase sets how often the agent uses each one. The instruction files name the situations where each can help. To require a teammate or an advisor consultation, name it in your request.
- The agent works on a body until its `Met when` condition holds. It asks you questions whenever your input can improve the work, and it continues after you answer.
- `AskUserQuestion` holds the run until you answer. The Notification hook emails each pending question.
- To continue an interrupted run in the same session, send `continue`. In a fresh session, paste `resume.md`.
- `pause.md` writes a resume note into `.agent/spec.md`, and `resume.md` removes it when the work is complete. While the note is open, the statusline shows the phase in purple.
- The agent can edit any project file, `Intent` included. The final message of a session or pause lists its changes to `Intent`, `CLAUDE*.md` files and files from this repo.

## Advisor

The advisor lets the agent consult Fable 5.1 while it works. Each consultation uses part of your Fable usage limit. The advisor is off until you turn it on.

In IMPLEMENT, the agent consults the advisor often, for example on the contract of each unit and before each commit. During MAINTAIN, a consultation occurs only when a decision needs Fable. For PROTOTYPE and ITERATE, the agent uses the advisor where Fable is strong, for example on design and wording.

- To use the advisor for one session, add `--advisor claude-fable-5-1` to the start command. Put `CLAUDE_CODE_FOOTER_INDICATOR=adv` in front of the command. The footer then shows `◆ adv`.
- To turn on the advisor from inside a session, send `/advisor claude-fable-5-1` as a message of its own. Then paste the body in a new message. This setting also applies to new sessions until you send `/advisor off`.

Claude Code reads a whole message that starts with `/advisor` as the advisor model name. Thus, a body in the same message does not get to the agent.

## Fable as MAIN

To run Fable 5.1 as the main agent, start the session with the Fable profile. Replace `<gpt-model>` and `<level>` as for an Opus session.

```sh
CLAUDE_CONFIG_DIR=$HOME/.claude/fable CLAUDE_CODE_SUBAGENT_MODEL=<gpt-model> ANTHROPIC_MODEL=claude-fable-5-1 headroom wrap claude --code-memory none --effort <level>
```

With `CLAUDE_CONFIG_DIR`, Claude Code reads its global `CLAUDE.md` and `settings.json` from `~/.claude/fable`. The other entries in that folder link into `~/.claude`, so Fable and Opus sessions share transcripts, history, MCP servers, agents, plugins and mods.

A Fable session has no advisor. Skip the advisor steps in this README and in the prompt headers.

To deploy or update the profile, run these commands from the repository root. Replace `<host>` with `cachyos` or `aeon`.

```sh
mkdir -p ~/.claude/fable
cp claude/<host>/fable/CLAUDE.md claude/<host>/fable/settings.json ~/.claude/fable/
claude/link-profile fable
```

After a Claude Code update or a new entry in `~/.claude`, run `claude/link-profile fable` again. `claude/link-profile --check fable` lists the changes that the profile needs and leaves the files as they are.
