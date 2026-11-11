# Phase prompts

Paste one body into a Claude Code session at the project root. The header of each file names its preconditions and the text to paste.

Each prompt comes in two sets with the same file names:

- `auto/` runs the prescribed session flow. It has no slot for your input.
- `steered/` starts with a `<request>` slot. Replace the slot with your request or steering before you paste. Your request outranks the rest of the body, but `Intent` outranks your request. The session stops when your request is done. If your request only steers, the session does all the work of the body. The agent adds each finding outside your request to `.agent/deferred.md`.

Use `steered/resume.md` to name the next work and its end point. Use `steered/maintain.md` for a specific request or for named `.agent/deferred.md` rows. `auto/maintain.md` works every row, including the rows that it adds. After a route to MAINTAIN, paste the `Request` body in `auto/maintain.md`. It does the request that the route wrote into `Phase`. To report a bug or to review part of the code, use the `Code review` body in `steered/maintain.md`. The `Code review` body in `auto/maintain.md` reviews the complete implementation and fixes each finding.

Start each fresh session with this command. Replace `<level>` with the effort level that you choose for the session.

```sh
claude --effort <level>
```

In IMPLEMENT and MAINTAIN, also turn on the advisor (`Advisor`).

The `agent-lanes` mod chooses the GPT model for each teammate. GPT-6.1 Sol is the default. It reviews code, builds the variants and spikes, and writes the blind test suites. The agent writes all other code itself. The agent picks GPT-6.1 Terra for visual work, computer use, technical writing and information-gathering fan-outs. When a fan-out classifies many items, `classifier` teammates on Sol do the work. It picks GPT-6 Astra for empirical science: the design of studies, experiments and benchmarks, and the inference of mechanisms from data. Sol also does mathematics. The agent writes machine-checked proofs itself. To replace the default Sol with another GPT model for one session, put `CLAUDE_CODE_SUBAGENT_MODEL=<gpt-model>` in front of the command. The other lanes keep their models. The main model and the effort level come from the command line. Without other flags, the session runs Opus 5.5 with a 1M context window at `medium` effort. To change the effort level, use only the `--effort` flag. This also applies when you resume a session. The `/effort` command writes the level into `settings.json`, and then the file differs from this repository. Choose the effort level for the phase:

- In PROTOTYPE and ITERATE, the agent builds the artifacts and their components itself. Teammates build the variants in parallel, one teammate for each variant. Testing and research stay at the minimum that keeps the prototype running. Teammates also research questions about the domain of your product. While the work goes on, a teammate keeps checking the newest commit from a fresh clone: ignore rules, layout, required files, and that each artifact runs. Before the agent shows you work, another teammate checks it against your `Intent` and your rulings. It reports drift, features that nobody asked for, and open questions for you. These phases typically use a lower effort level than IMPLEMENT and MAINTAIN. For each design choice that shapes a whole surface, such as the UI, these phases build at least ten conventional variants and at least five unconventional variants, each from a different idea. A teammate runs each variant and takes its screenshot. You see all variants on one contact sheet, together with a shortlist from the agent. You can open each variant on the shortlist at full size: live, and as a full-resolution screenshot. You pick one variant or combine them.
- IMPLEMENT runs about once and locks in many decisions, so it uses the most teammates at its start. First, several teammates read `Intent`, `Decisions` and the prototype independently. When their readings differ, the agent uses the reading that includes all of them. If no reading does, the agent asks you. A prototype detail counts only if one of your rulings or requests covers it. For each decision that is costly to reverse, for example the stack, the architecture or the data model, teammates research every candidate and build a spike for each finalist. Then at least three teammates give independent opinions, and the agent consults the advisor. Before the first unit, three teammates look for ways that the plan can fail. Each teammate examines two risk areas. A teammate also writes acceptance tests from your rulings without reading the code. In a shipped repository, a teammate first records the current behavior in tests. For core logic, teammates also check each contract and write tests from it without reading the code. The agent reviews its own code while the work is still in its context. The MAINTAIN reviews that follow read the code without that context, so the two reviews complement each other. Choose the `xhigh` or `max` effort level.
- In MAINTAIN, the agent uses teammates for deep work and for checks from a fresh context. One reviewer checks each complete change that touches core logic, a public interface or stored data. The agent checks the other changes. The `Code review` body is the full code review. Reviewers check the code in parallel, and their number follows the size of the review: a review of the complete code uses many reviewers, and a small change uses one. Each reviewer checks several aspects of the same code. Two reviewers check each part of the core logic independently. After IMPLEMENT closes, paste these MAINTAIN bodies in this order: `Dependency upgrade`, `Code review`, `Security review`, then `Queue`. The final message of the IMPLEMENT session names them. If a suspended scope continues first, the final message names the body for that scope first. The four bodies follow when `Phase` shows MAINTAIN again. Choose the `xhigh` or `max` effort level.

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
- The agent routes work without a confirmation from you. The session saves the open work in commits, sets up the next phase and ends. Its final message names the body for the next session. The session writes your request into `Phase`, so the `auto/` body is sufficient. Use the `steered/` body only to add steering.
- At the end of each session, `Phase` names the phase of the body to paste next. The statusline shows that phase.
- To skip this extra session, paste the steered body of the target phase into a fresh session. Put your request in its slot. This shortcut applies to PROTOTYPE, ITERATE and IMPLEMENT. Paste a MAINTAIN body only while `Phase` shows MAINTAIN.
- A route suspends the open work that it leaves in `Tasks`. That work continues after the routed work, or joins the routed work when both reach the same phase.
- PROTOTYPE and ITERATE are quick. They help you understand and decide the business logic and the direction. Each of your rulings goes into `Decisions` in `.agent/spec.md`. The prototype only shows the direction.
- IMPLEMENT then builds the best version of the software from your rulings. It selects the best stack again, and that stack can be the same as the prototype stack. IMPLEMENT takes as long as the best version needs.
- ITERATE on a surface that exists only as shipped code works on a copy. After your go, IMPLEMENT re-implements the approved changes in the shipped code.
- The template sets default structures, for example the prototype location, CI and the review ledger. A rule in `.claude/rules/` can adapt or retire one of them for a repository, and every prompt follows that rule.
- Fan-outs that gather information use one effort level lower than the session, but not lower than `medium`. Fan-outs that classify items use two levels lower. Astra uses one level higher. All other teammates use the effort level of the session. In PROTOTYPE and ITERATE, GPT-6.1 Sol does the work of Astra.
- The agent decides when to use a teammate or the advisor. The phase and the depth of the work set how often the agent uses each one. The agent writes the code itself, because it has the full context. Teammates write code in two cases only: blind test suites, and one variant or spike for each teammate. Teammates use a shared usage limit. Thus, the heavy teammate work is about half of the value that full attention needs: reviewer splits, panels of consultants, and the checks for each unit. The agent does a borderline task itself. Research, information gathering, variants, and the light checks of the repository and the direction keep their full scope, because they use a small part of the limit. The instruction files name the situations where each can help. To require a teammate or an advisor consultation, name it in your request.
- The agent works on a body until its `Met when` condition holds. It has your permission for every action, so it never asks for approval. When one option is clearly correct and scales with the project, the agent selects that option, also when it costs more work now. The agent asks you about direction, preference and taste only when no option is clearly correct. It also asks you for facts that only you know. It continues after you answer.
- `AskUserQuestion` holds the run until you answer. The Notification hook emails each pending question. If you close the dialog to clarify something, the agent answers you and then opens the dialog again.
- If you will be away, run `away for <duration>` or `away until <time>`. Then each session decides its questions itself and logs each decision. When you return, each session reports its log. For all options, run `away --help`.
- To continue an interrupted run in the same session, send `continue`. In a fresh session, paste `resume.md`.
- Each project keeps `.agent/spec-lint`, a copy of `claude/spec-lint`. It checks the shape of `.agent/spec.md`, and the gate runs it.
- `pause.md` and `pause-now.md` write a resume note into `.agent/spec.md`, and `resume.md` removes it when the work is complete. While the note is open, the statusline shows the phase in purple. The pause also saves the body that the session works under to `.scratch/body.md`. Thus, the next session does not search old transcripts for it.
- Each message that ends a turn starts with the state of the session: still working, waiting for you, or complete. When the session is complete and nothing runs, you can close it. The final message also names the body to paste next.
- The agent can edit any project file, `Intent` included. The final message of a session or pause lists its changes to `Intent`, `CLAUDE*.md` files and files from this repository.

## Template files

Each project carries its own copy of the template files. Machine-specific facts, such as tools, accounts and model settings, stay in your user-level `CLAUDE.md`. A fact that is true for one project on one machine only goes into `CLAUDE.local.md` at the project root. Private facts about a project, such as host names, key paths and data locations, also go into that file. Git ignores `CLAUDE.local.md`.

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
- The project has no `CLAUDE.md`. For a new project, add `--new`. If the directory is not in a git repository, `copy-template --new` runs `git init` there first.

To list the projects that are behind the template, run `copy-template --check ~/Projects/*`. This command copies nothing, and it skips repositories that have no `CLAUDE.md`. For all options, run `copy-template --help`.

Run `copy-template` before you paste `refresh.md`. The refresh session compares the new copies with the previous copies in git. Then it moves the project to the new template.

## Advisor

The advisor lets the agent consult Fable 5.2 while it works. Each consultation uses part of your Fable usage limit. To turn on the advisor, start the session with this command. The footer then shows `◆ adv`.

```sh
CLAUDE_CODE_FOOTER_INDICATOR=adv claude --advisor claude-fable-5-2 --effort <level>
```

When you resume a session, put `--advisor claude-fable-5-2` on that command too. To add the advisor to a running session, end the session and resume it with the flag.

In IMPLEMENT and MAINTAIN, the agent consults the advisor whenever Fable can improve the result: your intent, design and taste, naming and wording, its plan before it starts, a problem after a failed attempt, and its work before it finishes. For deep work, it also consults the advisor on the contract of each unit and before each commit. In IMPLEMENT, it also consults the advisor on decisions that are costly to reverse, after the teammates report.

## Fable as MAIN

To run Fable 5.2 as the main agent, start the session with the `fable` command. It accepts the same arguments as `claude`. Replace `<level>` as for an Opus session.

```sh
fable --effort <level>
```

`fable` is a link from `~/.local/bin` to `claude/fable`. It starts Claude Code with three settings:

- The configuration folder is the Fable profile, `~/.claude/fable` (`CLAUDE_CONFIG_DIR`). Claude Code reads its global `CLAUDE.md` from that folder.
- The model is `claude-fable-5-2`.
- The Opus `CLAUDE.md` stays out of the session. Claude Code also loads `.claude/CLAUDE.md` from each directory above the working directory. Thus, without this setting, a session below your home directory loads `~/.claude/CLAUDE.md` in addition, the file that the profile replaces.

The other entries in the profile folder link into `~/.claude`, so Fable and Opus sessions share settings, transcripts, history, MCP servers, plugins and mods. The Fable `CLAUDE.md` is the Opus `CLAUDE.md` with model-specific changes. It replaces the prompts from the Opus 5.5 prompting guide with prompts from the Fable 5.1 prompting guide, and it compares the teammates with Fable instead of Opus.

A Fable session has no advisor, so its command leaves out `--advisor`.

To deploy or update the profile, run these commands from the repository root. Replace `<host>` with `cachyos` or `aeon`.

```sh
mkdir -p ~/.claude/fable
cp claude/<host>/fable/CLAUDE.md ~/.claude/fable/
claude/link-profile fable
```

On a new machine, also add the link for the command: `ln -s ~/.local/app/agents/claude/fable ~/.local/bin/fable`.

If `~/.claude/fable/settings.json` is a copy of `~/.claude/settings.json`, `link-profile` replaces the copy with a link. After a Claude Code update or a new entry in `~/.claude`, run `claude/link-profile fable` again. `claude/link-profile --check fable` lists the changes that the profile needs and leaves the files as they are.
