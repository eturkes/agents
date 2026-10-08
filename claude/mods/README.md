# Claude Code mods

Each folder here is one Claude Code mod: a plugin of function hooks. A mod runs inside the Claude Code process. It receives live engine events, so it does not parse transcript files.

| Mod | Hosts | What it does |
| --- | --- | --- |
| `context-alert` | cachyos, aeon | Gives one notice per session, loop and tier as context nears compaction. A resumed session keeps the notices it already gave. The main loop gets a notice at 54K and 25K below its compaction point. A teammate gets a notice at 89K and 30K below its compaction point. |
| `agent-flow` | cachyos, aeon | Appends the deliverable note to every subagent brief. Performs a subagent `Write` that Claude Code rejects for a report file name. Adds the deliverable line to compaction instructions. Asks a long run that wrote nothing at stop. Holds the first `TaskStop` on a mid-turn teammate. Shows a line under the prompt hint with the model and context use of each running agent, idle teammates included, against its compaction trigger. The entries flow onto more lines when the row is full. |
| `turn-email` | cachyos | Sends one email per completed main turn that you start, one when a run ends with no work in flight, and one per dialog that waits for you. The relay setup is in `../cachyos/turn-email/README.md`. |

## Load

Claude Code loads each folder that the settings `env` key `CLAUDE_CODE_PLUGIN_DIRS` names. The settings files `../cachyos/settings.json` and `../aeon/settings.json` name the deployed copies under `~/.claude/mods/`. Mods need Claude Code 2.1.288 or newer.

An interactive session watches these folders. When you deploy a change, running sessions reload the mod.

## Deploy

Run from the repository root. On aeon, leave out `turn-email`.

```sh
mkdir -p ~/.claude/mods
for m in context-alert agent-flow turn-email; do
  rsync -a --delete --exclude .claude-plugin/types/ --exclude tsconfig.json "claude/mods/$m/" "$HOME/.claude/mods/$m/"
done
```

## Check

The engine writes the API types into `.claude-plugin/types/` when it loads a mod. The settings load only the deployed copies, so `tsc` needs a copy of those types in the repository folder. That folder ignores itself in git.

Run these checks from the repository root for each mod before you commit a change:

```sh
rsync -a --delete ~/.claude/mods/<name>/.claude-plugin/types/ claude/mods/<name>/.claude-plugin/types/
claude plugin validate claude/mods/<name>
claude plugin test claude/mods/<name>
tsc -p claude/mods/<name>
```

If the mod is not deployed on this host, copy the types of a different deployed mod. The types are the same for all mods, except for the MCP tool types. If no mod is deployed, type-check with the `tsconfig.json` from the header of the plugin-authoring skill's `types/claude-code.d.ts`.

Each mod's `tsconfig.json` sets `noEmit`. Without the types, `tsc` fails and writes no files.
