# Phase prompts

Paste one body into a Claude Code session at the project root. The header of each file names its preconditions and the text to paste.

Each prompt comes in two sets with the same file names:

- `auto/` runs the prescribed session flow. It has no slot for your input.
- `steered/` starts with a `<request>` slot. Replace the slot with your request or steering before you paste. Your request outranks the rest of the body, but `Intent` outranks your request. The session stops when your request is done. If your request only steers, the session does all the work of the body. The agent adds each finding outside your request to `.agent/deferred.md`.

Use `steered/resume.md` to name the next work and its end point. Use `steered/maintain.md` for a specific request or for named `.agent/deferred.md` rows. `auto/maintain.md` works every row, including the rows that it adds. To report a bug or to review part of the code, use the `Code review` body in `steered/maintain.md`. The `Code review` body in `auto/maintain.md` reviews the complete implementation and fixes each finding.

Start each fresh session with this command. Replace `<level>` with the effort level that you choose for the session.

```sh
claude --effort <level>
```

In IMPLEMENT and MAINTAIN, also turn on the advisor (`Advisor`).

The `agent-lanes` mod chooses the GPT model for each teammate. GPT-6.1 Sol is the default and does all code work. This includes the variants of a user interface. The agent picks GPT-6.1 Terra for visual work, computer use, technical writing and information-gathering fan-outs. When a fan-out classifies many items, Sol does the work at `medium` effort. It picks GPT-6 Astra for empirical science: the design of studies, experiments and benchmarks, and the inference of mechanisms from data. Sol also does mathematics and machine-checked proofs. To replace the default Sol with another GPT model for one session, put `CLAUDE_CODE_SUBAGENT_MODEL=<gpt-model>` in front of the command. The other lanes keep their models. The main model and the effort level come from the command line. Without other flags, the session runs Opus 5.5 with a 1M context window at `medium` effort. To change the effort level, use only the `--effort` flag. This also applies when you resume a session. The `/effort` command writes the level into `settings.json`, and then the file differs from this repository. Choose the effort level for the phase:

- In PROTOTYPE and ITERATE, the agent coordinates, and teammates build the artifacts, components and variants in parallel. Testing and research stay at the minimum that keeps the prototype running. Teammates also research questions about the domain of your product. While the work goes on, a teammate keeps checking the newest commit from a fresh clone: ignore rules, layout, required files, and that each artifact runs. Before the agent shows you work, another teammate checks it against your `Intent` and your rulings. It reports drift, features that nobody asked for, and open questions for you. Choose the `medium` effort level, because at `low` the teammates that operate apps and browsers make more errors. For each design choice that shapes a whole surface, such as the UI, these phases build at least ten conventional variants and at least five unconventional variants, each from a different idea. A teammate runs each variant and takes its screenshot. You see all variants on one contact sheet, together with a shortlist from the agent. You pick one variant or combine them.
- IMPLEMENT runs about once and locks in many decisions, so it uses the most teammates at its start. First, several teammates read `Intent`, `Decisions` and the prototype independently. When their readings differ, the agent asks you. A prototype detail counts only if one of your rulings or requests covers it. For each decision that is costly to reverse, for example the stack, the architecture or the data model, teammates research every candidate and build a spike for each finalist. Then at least five teammates give independent opinions, and the agent consults the advisor. Before the first unit, teammates look for ways that the plan can fail. A teammate also writes acceptance tests from your rulings without reading the code. In a shipped repository, a teammate first records the current behavior in tests. For core logic, teammates also check each contract and write tests from it without reading the code. The agent reviews its own code while the work is still in its context. The MAINTAIN reviews that follow read the code without that context, so the two reviews complement each other. Choose the `xhigh` or `max` effort level.
- In MAINTAIN, the agent uses teammates for deep work and for checks from a fresh context. One reviewer checks each complete change. The `Code review` body is the full code review. Reviewers check the code in parallel, and their number follows the size of the review: a review of the complete code uses many reviewers, and a small change uses one or a few. Two reviewers check each part of the core logic independently. After IMPLEMENT closes, paste these MAINTAIN bodies in this order: `Dependency upgrade`, `Code review`, `Security review`, then `Queue`. The final message of the IMPLEMENT session names them. Choose the `xhigh` or `max` effort level.

| Situation | File | Use |
| --- | --- | --- |
| Start PROTOTYPE | `prototype.md` | Write your `Intent` in `.agent/spec.md` first. A new repository also needs the template files (`Template files`). In a shipped repository, also name the scope in `Phase`. After a route, `Phase` already names it. |
| Start ITERATE | `iterate.md` | When PROTOTYPE closes or after a route, paste it. With `auto/`, the session runs until you say go. With `steered/`, it works your feedback into the prototype as one round. |
| Start IMPLEMENT | `implement.md` | After you say go or after a route, start a session with the advisor (`Advisor`). Then paste it. It can also open a new scope directly at IMPLEMENT. |
| MAINTAIN | `maintain.md` | Start a session with the advisor (`Advisor`). Paste one body per request, bug report, queue run, code review, security review or dependency upgrade. |
| Move work to another phase | `route.md` | Make your request in any session, or paste this body after it. |
| Continue open work in any phase | `resume.md` | Paste in a fresh session after a pause, a crash or a restart. |
| Stop now and continue later | `pause-now.md` | Paste into the running session. In-flight work stops, and the repository stays consistent. |
| Stop after in-flight work finishes | `pause.md` | Paste into the running session. Teammates and running units finish first. |
| Repository on an older template | `refresh.md` | Copy in the template files first (`Template files`). The session does the migration and nothing else. |

- A phase applies to a scope: the whole product, or one surface or feature of a shipped repository.
- Work can move to any phase, also back to an earlier one. For example, a large MAINTAIN request moves to IMPLEMENT. Several sessions of work on a demo UI move to ITERATE. A rework of the whole product moves to PROTOTYPE.
- Before a route, the agent asks you to confirm it, unless your request names the phase. The session then saves the open work in commits, sets up the next phase and ends. Its final message names the body for the next session.
- To skip this extra session, paste the steered body of the target phase into a fresh session. Put your request in its slot.
- A route suspends the open work that it leaves in `Tasks`. That work continues after the routed work, or joins the routed work when both reach the same phase.
- PROTOTYPE and ITERATE are quick. They help you understand and decide the business logic and the direction. Each of your rulings goes into `Decisions` in `.agent/spec.md`. The prototype only shows the direction.
- IMPLEMENT then builds the best version of the software from your rulings. It selects the best stack again, and that stack can be the same as the prototype stack. IMPLEMENT takes as long as the best version needs.
- ITERATE on a surface that exists only as shipped code works on a copy. After your go, IMPLEMENT re-implements the approved changes in the shipped code.
- The template sets default structures, for example the prototype location, CI and the review ledger. A rule in `.claude/rules/` can adapt or retire one of them for a repository, and every prompt follows that rule.
- Teammates run at the effort level of the session. Two lanes set their own effort level: fan-outs run at medium, and Astra runs at max. This applies to fan-outs that gather information and to fan-outs that classify items. In PROTOTYPE and ITERATE, GPT-6.1 Sol does the work of Astra.
- The agent decides when to use a teammate or the advisor. The phase and the depth of the work set how often the agent uses each one. The instruction files name the situations where each can help. To require a teammate or an advisor consultation, name it in your request.
- The agent works on a body until its `Met when` condition holds. It asks you questions whenever your input can improve the work, and it continues after you answer.
- `AskUserQuestion` holds the run until you answer. The Notification hook emails each pending question.
- To continue an interrupted run in the same session, send `continue`. In a fresh session, paste `resume.md`.
- Each project keeps `.agent/spec-lint`, a copy of `claude/spec-lint`. It checks the shape of `.agent/spec.md`, and the gate runs it.
- `pause.md` and `pause-now.md` write a resume note into `.agent/spec.md`, and `resume.md` removes it when the work is complete. While the note is open, the statusline shows the phase in purple.
- The agent can edit any project file, `Intent` included. The final message of a session or pause lists its changes to `Intent`, `CLAUDE*.md` files and files from this repository.

## Template files

Each project carries its own copy of the template files. No file in a project refers to this repository or to this machine. Thus, other developers can use the project as it is. Machine-specific facts, such as tools, accounts and model settings, stay in your user-level `CLAUDE.md`. A fact that applies to one project on one machine goes into `CLAUDE.local.md` at the project root. Git ignores that file.

| File in the project | Source in this repository |
| --- | --- |
| `CLAUDE.md` | `claude/CLAUDE.project.md` |
| `.claude/agents/*.md` (teammate roles) | `claude/agents/*.md` |
| `.agent/spec-lint` | `claude/spec-lint` |

To copy the files in, run this command at the project root:

```sh
copy-template
```

`copy-template` is a link from `~/.local/bin` to `claude/copy-template`. On a new machine, add the link: `ln -s ~/.local/app/agents/claude/copy-template ~/.local/bin/copy-template`.

The script copies only the files that differ from the template. It keeps the role files that the template does not have. The script does not change a project in these cases:

- A template file in the project has uncommitted changes. Commit or discard them first.
- The project has no `CLAUDE.md`. For a new repository, run `git init` first, then add `--new`.

To list the projects that are behind the template, run `copy-template --check ~/Projects/*`. This command copies nothing, and it skips repositories that have no `CLAUDE.md`. For all options, run `copy-template --help`.

Run `copy-template` before you paste `refresh.md`. The refresh session compares the new copies with the previous copies in git. Then it moves the project to the new template.

## Advisor

The advisor lets the agent consult Fable 5.1 while it works. Each consultation uses part of your Fable usage limit. To turn on the advisor, start the session with this command. The footer then shows `◆ adv`.

```sh
CLAUDE_CODE_FOOTER_INDICATOR=adv claude --advisor claude-fable-5-1 --effort <level>
```

When you resume a session, put `--advisor claude-fable-5-1` on that command too. To add the advisor to a running session, end the session and resume it with the flag.

In IMPLEMENT and MAINTAIN, the agent consults the advisor whenever Fable can improve the result: your intent, design and taste, naming and wording, its plan before it starts, a problem after a failed attempt, and its work before it finishes. For deep work, it also consults the advisor on the contract of each unit and before each commit. In IMPLEMENT, it also consults the advisor on decisions that are costly to reverse, after the teammates report.

## Fable as MAIN

To run Fable 5.1 as the main agent, start the session with the Fable profile and the `--model` flag. Replace `<level>` as for an Opus session.

```sh
CLAUDE_CONFIG_DIR=$HOME/.claude/fable claude --model claude-fable-5-1 --effort <level>
```

With `CLAUDE_CONFIG_DIR`, Claude Code reads its global `CLAUDE.md` from `~/.claude/fable`. The other entries in that folder link into `~/.claude`, so Fable and Opus sessions share settings, transcripts, history, MCP servers, plugins and mods. The Fable `CLAUDE.md` is the Opus `CLAUDE.md` with model-specific changes. It replaces the prompts from the Opus 5.5 prompting guide with prompts from the Fable 5.1 prompting guide, and it compares the teammates with Fable instead of Opus.

A Fable session has no advisor, so its command leaves out `--advisor`.

To deploy or update the profile, run these commands from the repository root. Replace `<host>` with `cachyos` or `aeon`.

```sh
mkdir -p ~/.claude/fable
cp claude/<host>/fable/CLAUDE.md ~/.claude/fable/
claude/link-profile fable
```

If `~/.claude/fable/settings.json` is a copy of `~/.claude/settings.json`, `link-profile` replaces the copy with a link. After a Claude Code update or a new entry in `~/.claude`, run `claude/link-profile fable` again. `claude/link-profile --check fable` lists the changes that the profile needs and leaves the files as they are.
