# Claude Code mods

Folder = one CC mod = a plugin of function hooks running inside the CC process on live engine events ⇒ no transcript parsing.

| Mod | Hosts | Does |
| --- | --- | --- |
| `context-alert` | cachyos, aeon | One notice per session, loop + tier as context nears compaction: main loop at 65K + 27K below its compaction point, teammate at 82K + 35K. A session resumed within 7 days of its last notice keeps the notices already given. |
| `agent-flow` | cachyos, aeon | Appends the deliverable note to every subagent brief; performs a subagent `Write` CC rejects for a report filename; adds the deliverable line to compaction instructions; asks a long run that wrote nothing at stop; holds the first `TaskStop` on a mid-turn teammate; line under the prompt hint = each running agent's model + effort + context use against its compaction trigger, idle teammates included, wrapping onto more lines when full. |
| `agent-lanes` | cachyos, aeon | Routes every subagent but a fork to a GPT lane (`hooks/lanes.ts`): the Agent tool's `model` alias, else the role's default, else sol (launch env `CLAUDE_CODE_SUBAGENT_MODEL` in its place); fills the lane's effort where the call names none + pins each agent's call effort onto every request it makes (teammates otherwise run the session's effort; listed before `agent-flow` in `CLAUDE_CODE_PLUGIN_DIRS`, so the agent line shows the pinned level); PROTOTYPE + ITERATE (`.agent/spec.md` `Phase`) → a `lateOnly` lane (astra) takes the default; refuses `fable` + non-GPT models; appends the mapping to the Agent tool description; sends each terra agent back once at its first stop. Requires `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` unset in settings `env` (set, it drops per-call + hook models). |
| `idle-compact` | cachyos, aeon | Every 30 s tells [`cache-keepalive`](../cache-keepalive/README.md) whether the session is quiet (no running turn; last turn left no background task or scheduled wakeup); compacts the session when the keeper asks at its 55-min mark. Interactive sessions alone. |
| `turn-email` | cachyos | One email per completed main turn leaving no work in flight (CC's `busy`/`shell` status = emachine's Working: background shell or `Monitor`, running subagent, workflow or teammate turn; + a scheduled wakeup), one per dialog waiting on me. Relay setup = `../cachyos/turn-email/README.md`. |

## Load

- CC loads each folder named in settings `env` `CLAUDE_CODE_PLUGIN_DIRS`; `../cachyos/settings.json` + `../aeon/settings.json` name the deployed copies under `~/.claude/mods/`. Needs CC ≥ 2.1.288.
- Interactive sessions watch these folders ⇒ a deployed change reloads the mod in running sessions.

## Deploy

From the repo root; aeon omits `turn-email`.

```sh
mkdir -p ~/.claude/mods
for m in context-alert agent-flow agent-lanes idle-compact turn-email; do
  rsync -a --delete --exclude .claude-plugin/types/ --exclude tsconfig.json "claude/mods/$m/" "$HOME/.claude/mods/$m/"
done
```

## Check

- The engine writes the API types into `.claude-plugin/types/` when it loads a mod; settings load the deployed copies alone ⇒ `tsc` needs a copy of those types in the repo folder (self-ignored in git).
- Per mod, from the repo root, before each commit:

```sh
rsync -a --delete ~/.claude/mods/<name>/.claude-plugin/types/ claude/mods/<name>/.claude-plugin/types/
claude plugin validate claude/mods/<name>
claude plugin test claude/mods/<name>
tsc -p claude/mods/<name>
```

- Mod undeployed on this host → copy another deployed mod's types (identical across mods, MCP tool types aside); none deployed → type-check with the `tsconfig.json` from the header of the plugin-authoring skill's `types/claude-code.d.ts`.
- Each mod's `tsconfig.json` sets `noEmit` ⇒ types missing → `tsc` fails + writes nothing.
