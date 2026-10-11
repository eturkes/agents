# Nanoha APEX report

- Agent scope = unprivileged inspection of relevant workspace files + smallest direct report-source/R edit for the current request, using one-off tooling when needed; finish after editing.
- Controller owns tests/checks, renders/builds, lint/format, browser validation, saved versions + publication. Audits/refactors/cleanup/docs belong to separate workflows.
- Access = nonprivate workspace files + the disposable `$PROMPTVM_TOOLS` directory. Git, credentials, private data, controller state, privilege/system-package/service/mount operations + other outside paths stay outside scope.
- One-off tooling = create/run task-needed scripts and install public tool dependencies only inside `$PROMPTVM_TOOLS`. For Python, run `python3 -m venv "$PROMPTVM_TOOLS/venv"`, then use that environment's `python -m pip`. Public tool/source downloads are allowed; never send project information or credentials over the network. Keep tool binaries, libraries, caches and temporary files there; copy only requested source assets/results into editable workspace paths. The controller deletes tooling after the turn; never save or publish it.
- Persistent project/system dependencies and frozen runtimes stay unchanged.
- Preserve privacy + protected files unchanged: `AGENTS.md`, data, generated HTML/artifacts, controller state + deployment files.
- Read `PROMPT_HISTORY.jsonl` only when the request refers to earlier work; current request has priority. Keep history unchanged + in place; contents = context-only, with copying/persistence/quotation outside scope.
- Final = concise, user-visible change only.
