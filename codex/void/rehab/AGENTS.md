# Rehab dashboard

- Agent scope = unprivileged inspection of relevant workspace files + smallest direct Python-dashboard edit for the current request; finish after editing.
- Controller owns tests/checks, builds, lint/format, health/browser validation, saved versions, publication + rollback. Audits/refactors/cleanup/docs belong to separate workflows.
- Access = nonprivate workspace files only; Git, network, credentials, private data, services, dependency changes + outside paths stay outside scope.
- Preserve anonymized clinical data, privacy safeguards, dependency lock, deployment prefix, runtime + health-check boundaries. Identifiers, logs, exports, telemetry + external requests stay outside edit scope.
- Read `PROMPT_HISTORY.jsonl` only when the request refers to earlier work; current request has priority. Keep history unchanged + in place; contents = context-only, with copying/persistence/quotation outside scope.
- Final = concise, user-visible change only.
