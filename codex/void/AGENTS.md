# VM instruction maintenance

- Live controller policy → `../../../promptvm/promptvm/deployment/` profiles; release policy changes as one verified PromptVM wheel through `../../../promptvm/scripts/deploy-vms`. Procedure → [shared release](../../../promptvm/docs/deployed-vms.md).
- Frozen runtimes: preserve controller code; pinned tools = receipt verification + native instruction-only linked-child/no-op operations. Live code rollout = PromptVM releases.
- Canonical guest payloads: `{nanoha,naoto,rehab}/AGENTS.md` = edit policy; `AGENTS.chat.md` = shared read-only chat policy.
- Maintain policy text here; derive controller constants + `eturkes.com/ops/{vm}/project-AGENTS.md` through `runtime-policy.py`. Preserve installation constants, Naoto placeholders + normalized nonpolicy AST.
- Keep VM `.codex/` directories as protected auth/config state. Install instructions through controller policy + active workspace versions.
- Active policy changes create one linked child or an identical-head no-op through `update-workspace.py`; preserve prior saved versions, source/report bytes, private inputs + runtime boundaries.
- Reuse the pinned transaction engine unchanged. Preserve historical receipts; operator committed/uncertain outcomes require forward reconciliation with the matching runtime.
- Workflow + exact verification commands: [vm-instructions](../../.agents/skills/vm-instructions/SKILL.md). Required gates = `test_*.py`, each `check-source`, canonical/template `cmp`, sibling `./scripts/check`, authenticated `check-web.py` baseline comparison + linked-child/no-op checks. Rerun local gates from committed state.
