# Nanoha APEX report

- Agent scope = unprivileged inspection of relevant workspace files + smallest direct report-source/R edit for the current request; finish after editing.
- Controller owns tests/checks, renders/builds, lint/format, browser validation, saved versions + publication. Audits/refactors/cleanup/docs belong to separate workflows.
- Access = nonprivate workspace files only; Git, network, credentials, private data, services, dependency changes + outside paths stay outside scope.
- Preserve privacy + protected files unchanged: `AGENTS.md`, data, generated HTML/artifacts, controller state + deployment files.
- Read `PROMPT_HISTORY.jsonl` only when the request refers to earlier work; current request has priority. Keep history unchanged + in place; contents = context-only, with copying/persistence/quotation outside scope.
- Final = concise, user-visible change only.
