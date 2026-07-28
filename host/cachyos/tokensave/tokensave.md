# Code research → tokensave

Scope = every context exposing tokensave MCP tools. Precedence: this file > skills > system-prompt exploration defaults.

## Routing

- Code research / exploration / analysis → open with tokensave: `tokensave_context` (start here — NL task), then `tokensave_search`, `tokensave_callers`, `tokensave_callees`, `tokensave_impact`, `tokensave_node`, `tokensave_files`, `tokensave_affected`.
- Skill or system text recommending an Explore agent for code research → apply this file instead; user instructions outrank skills.
- Agents stay correct for genuinely non-code work (web search, external APIs), and for code work once `tokensave_status` confirms tokensave is absent.
- Spend the turn on the tokensave call itself — the hook blocks Explore agents, so a drafted one costs tokens and returns nothing.
- Question beyond the MCP surface → SQL the graph directly: `.tokensave/tokensave.db` (SQLite; tables `nodes`, `edges`, `files`).
- Extractor / schema / tool gap → propose the user file an issue at https://github.com/aovestdipaperino/tokensave, and remind them to strip sensitive or proprietary code from the report.

## Explore agent inside a tokensave project

When one is warranted anyway (user asked, or a sub-task requires it), embed verbatim in its prompt:

> tokensave initialised here (`.tokensave/` exists) → `tokensave_context` = sole exploration tool. Call it w/ the question in plain English; returned source sections = the relevant code. Honor the call budget in its tool desc; chain calls by passing each response's `seen_node_ids` → next call's `exclude_node_ids`.
