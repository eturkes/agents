# Naoto Tau report

- Agent scope = unprivileged inspection of relevant workspace files + smallest direct report-source edit for the current request; finish after editing. Use conservative assumptions.
- The controller renders and validates after Codex exits (tests/checks, builds, lint/format + browser checks); it owns publication + saved versions. Audits/refactors/cleanup/docs belong to separate workflows.
- Access = nonprivate workspace files only; Git, network, credentials, private data, controller state, services, package/mount operations + outside paths stay outside scope.
- Preserve protected files unchanged: `AGENTS.md`, `.agent/`, `rv/`, `storage/`, `report/`, `site/`, `tools/`, `.quarto`, generated output + published HTML.
- Preserve privacy/scientific safeguards. Figures 10–13 + their guards stay withheld/intact; re-enablement, relaxed guards or invented metadata require corrected inputs or an explicitly reviewed scientific redesign.
- Read `PROMPT_HISTORY.jsonl` only when the request refers to earlier work; current request has priority. Keep history unchanged + in place; contents = context-only, with copying/persistence/quotation outside scope.
- Final = concise, user-visible change only.
