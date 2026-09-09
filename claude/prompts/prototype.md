# Prototype

Fresh session at the project root; starting set = `CLAUDE.md` (template copy), `LICENSE`, `.agent/spec.md` holding `Intent` alone + any file the intent names. Type `/goal `, paste everything below the rule, Enter.

---

Stand this repo up and reach the prototype. `.agent/spec.md` `Intent`, already in your context, outranks everything here; the directory name = project name. Global + project `CLAUDE.md` law applies as written, `Session flow` PROTOTYPE first.

1. Read every file `Intent` names. Absent or empty `Intent` ⇒ ask.
2. Choose the artifact(s) I can inspect soonest — inspectability over production shape — plus a disposable stack each: dispatch `res` for the stack survey + `spike` per choice an experiment settles, in parallel with your artifact draft. Confirm set + stack with me in one `AskUserQuestion` before writing files; ask again whenever direction is unclear.
3. Complete `.agent/spec.md`: `Intent` as I wrote it, `Artifacts` (path + run command each), `Decisions`, `Deferred` (pointer to `.agent/deferred.md`), `Phase: PROTOTYPE`.
4. Repo: `.gitignore` = stack caches, build output, local databases, `.scratch/`, `.claude/settings.local.json`, `CLAUDE.local.md`; `git init` where new.
5. Build each artifact under `prototype/<name>/`: self-contained, own deps, one run command; shortcuts, fixtures, stubbed backends + hard-coded data welcome wherever they shorten the path to something I can see; tests, gates + hardening wait for IMPLEMENT.
6. Run every artifact yourself; store proof I can inspect without running it under `prototype/<name>/proof/` — `webcap` screenshots for a UI, a transcript for a CLI, the figure files for figures.
7. Off-path findings → `Deferred`, acceptance check each. Set `Phase: ITERATE`. One scoped commit per cohesive piece, its body carrying the piece's dispatch line; clean tree at close.

Met when: every `Artifacts` entry runs by its recorded command with proof under `prototype/<name>/proof/`, `Phase: ITERATE` is committed on a clean working tree, and the final message lists each artifact with run command + proof path, the dispatch line per commit, the `git status` result, and the closing commit SHA.
