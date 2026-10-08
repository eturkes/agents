# Prototype

Write your `Intent` in `.agent/spec.md`. Add each file that the intent names. A new repo also needs `CLAUDE.md` (a copy of the template) and `LICENSE`. In a shipped repo, name the scope in `Phase`. Start a fresh session at the project root. Paste everything below the rule.

---

Reach the prototype for the scope in `.agent/spec.md` `Phase` — in a new repo, the whole product. `Intent`, already in your context, outranks everything here. Global + project `CLAUDE.md` law applies as written, `Session flow` PROTOTYPE first.

1. Read every file `Intent` names; in a shipped repo, also the surfaces the scope touches + its `.claude/rules/`. Absent or empty `Intent` ⇒ ask.
2. Choose the artifact(s) I can inspect soonest — inspectability over production shape — plus a disposable stack each: `researcher` per stack survey past a few sources, spikes by your own hand. Confirm set + stack with me in one `AskUserQuestion` before writing files; ask again whenever direction is unclear.
3. Complete `.agent/spec.md`: `Intent` as I wrote it, `Artifacts` (each prototype entry: path + run command), `Decisions`, `Tasks` (the build checklist), `Phase: PROTOTYPE — <scope>`; `consultant` reviews this plan before the first build file.
4. Repo: a new one gets `git init` + a `.gitignore` for stack caches, build output, local databases, `.scratch/`, `.claude/settings.local.json`, `CLAUDE.local.md`, and takes its project name from the directory; a shipped one extends its `.gitignore`.
5. Build each artifact at its `Artifacts` path per `Session flow` PROTOTYPE: own deps, one run command; fixtures, stubbed backends + hard-coded data welcome wherever they shorten the path to something I can see; tests, gates + hardening wait for IMPLEMENT.
6. Run every artifact yourself by its recorded command and check what I will see — `webcap` for a UI, `operator` for multi-state UI flows.
7. Review: `reviewer` over the whole diff on lenses fixed before reading — every prototype entry in `Artifacts` runs by its recorded command, each stub, shortcut + hard-coded value reads as one wherever I would take it for real, `spec.md` matches what shipped; you adjudicate, accepted fixes land before close.
8. Off-path findings + every unfixed `reviewer` row → `.agent/deferred.md`, acceptance check each. Set `Phase: ITERATE — <scope>`. One scoped commit per cohesive piece; clean tree at close.

Met when: every prototype entry in `Artifacts` runs by its recorded command, a shipped repo's existing gates still pass, `Phase: ITERATE` is committed on a clean working tree, and the final message lists each artifact with its run command, a shipped repo's gate result with its skipped, not-run + missing checks named or `none`, each teammate by name + role + verdict with the closing `reviewer` among them, each advisor call with your ruling (or `none`), what you could not confirm, the `git status` result, and the closing commit SHA.
