# Prototype

Fresh session at the project root, launched with `--effort medium`; starting set = `CLAUDE.md` (template copy), `LICENSE`, `.agent/spec.md` holding `Intent` alone + any file the intent names. Paste everything below the rule.

---

Stand this repo up and reach the prototype. `.agent/spec.md` `Intent`, already in your context, outranks everything here; the directory name = project name. Global + project `CLAUDE.md` law applies as written, `Session flow` PROTOTYPE first.

1. Read every file `Intent` names. Absent or empty `Intent` ⇒ ask.
2. Choose the artifact(s) I can inspect soonest — inspectability over production shape — plus a disposable stack each: `researcher` per stack survey past a few sources, spikes by your own hand. Confirm set + stack with me in one `AskUserQuestion` before writing files; ask again whenever direction is unclear.
3. Complete `.agent/spec.md`: `Intent` as I wrote it, `Artifacts` (path + run command each), `Decisions`, `Tasks` (the build checklist), `Phase: PROTOTYPE`; `consultant` reviews this plan before the first build file.
4. Repo: `.gitignore` = stack caches, build output, local databases, `.scratch/`, `.claude/settings.local.json`, `CLAUDE.local.md`; `git init` where new.
5. Build each artifact under `prototype/<name>/`: self-contained, own deps, one run command; shortcuts, fixtures, stubbed backends + hard-coded data welcome wherever they shorten the path to something I can see; tests, gates + hardening wait for IMPLEMENT.
6. Run every artifact yourself; store proof I can inspect without running it under `prototype/<name>/proof/` — `webcap` screenshots for a UI (`operator` for multi-state UI flows), a transcript for a CLI, the figure files for figures.
7. Review: `reviewer` over the whole diff on lenses fixed before reading — every `Artifacts` entry runs by its recorded command, proof shows what it claims, each stub, shortcut + hard-coded value reads as one wherever I would take it for real, `spec.md` matches what shipped; you adjudicate, accepted fixes land before close.
8. Off-path findings + every unfixed `reviewer` row → `.agent/deferred.md`, acceptance check each. Set `Phase: ITERATE`. One scoped commit per cohesive piece; clean tree at close.

Met when: every `Artifacts` entry runs by its recorded command with proof under `prototype/<name>/proof/`, `Phase: ITERATE` is committed on a clean working tree, and the final message lists each artifact with run command + proof path, each teammate by name + role + verdict with the closing `reviewer` among them, what you could not confirm, the `git status` result, and the closing commit SHA.
