# Claude Code mods

Each folder here is one Claude Code mod: a plugin of function hooks. A mod runs inside the Claude Code process. It receives live engine events, so it does not parse transcript files.

| Mod | Hosts | What it does |
| --- | --- | --- |
| `context-alert` | cachyos, aeon | Gives one notice per session, loop and tier as context nears compaction. A resumed session keeps the notices it already gave. The main loop gets a notice at 100K and 50K below its window. A teammate gets a notice at 205K and 255K. |
| `astra-advisor` | cachyos, aeon | After each `advisor()` call, `gpt-6-astra` reviews a session fork that ends just before the call. The verdict rides on `echo second-advisor`, on the next refused call, or on a blocked turn end. `mcp__astra-advisor__rebut` runs one reconciliation round. The pending review is kept in host state, so a reload of the mod keeps it. |
| `agent-flow` | cachyos, aeon | Appends the deliverable note to every subagent brief. Performs a subagent `Write` that Claude Code rejects for a report file name. Adds the deliverable line to compaction instructions. Asks a long run that wrote nothing at stop. Holds the first `TaskStop` on a mid-turn teammate. Shows the context use of running teammates in the status line. |
| `turn-email` | cachyos | Sends one email per completed main turn and one per dialog that waits for you. The relay setup is in `../cachyos/turn-email/README.md`. |

## Load

Claude Code loads each folder that the settings `env` key `CLAUDE_CODE_PLUGIN_DIRS` names. The settings files `../cachyos/settings.json` and `../aeon/settings.json` name the deployed copies under `~/.claude/mods/`. Mods need Claude Code 2.1.288 or newer.

An interactive session watches these folders. When you deploy a change, running sessions reload the mod.

## Deploy

Run from the repository root. On aeon, leave out `turn-email`.

```sh
mkdir -p ~/.claude/mods
for m in context-alert astra-advisor agent-flow turn-email; do
  rsync -a --delete --exclude .claude-plugin/types/ --exclude tsconfig.json "claude/mods/$m/" "$HOME/.claude/mods/$m/"
done
```

## Check

Run these three checks for each mod before you commit a change:

```sh
claude plugin validate claude/mods/<name>
claude plugin test claude/mods/<name>
tsc -p claude/mods/<name>
```

The engine writes the API types into `.claude-plugin/types/` when it loads a mod. That folder ignores itself in git. Before the first load, type-check with the `tsconfig.json` from the header of the plugin-authoring skill's `types/claude-code.d.ts`.
