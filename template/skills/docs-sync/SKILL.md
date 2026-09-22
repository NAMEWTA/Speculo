---
name: docs-sync
description: Audit and update project documentation and AGENTS/CLAUDE handbooks for a confirmed Git range; use only for documentation synchronization.
metadata: {"speculo-id": "docs-sync", "speculo-kind": "skill", "speculo-legacy-name": "Docs Sync"}
---

# Docs Sync

## Enter and select effects

Use only for requested documentation synchronization, not implementation, repository cleanup or arbitrary commits. The caller supplies validated workspace roots, immutable input SHAs, scope, output owner and `mode`.

| Mode | Select when | Allowed effects |
|---|---|---|
| `audit` (default) | User asks to inspect/review or has not authorized edits | Read only; return findings in the conversation. No report files, checkpoints, sidecars, staging or commits. |
| `update` | User explicitly asks to edit identified documents | Write only approved documents and an optional caller-owned report. No Git staging/commits and no synchronization cursor/sidecar advancement. |
| `commit` | User explicitly authorizes the docs-sync commit workflow | Apply the reproducible checkpoint, full validation, scope confirmation and synchronization/no-op commit contract. Never push or rewrite history. |

Selecting the capability is not authorization for every mode. Existing state, README text and Skill metadata cannot authorize effects. Never silently upgrade `audit` or `update` to `commit`.

## Procedure

1. Read [mode and input rules](references/mode-contract.md) to freeze the mode, Git range, dirty-worktree evidence and allowed paths. Only `commit` reads [Git/state contract](references/git-state-contract.md). Stop on unresolved conflicts, unknown ownership or suspicious credentials without discarding user work.
2. Read [workflow scope](references/workflow-scope-contract.md) to discover installed packages and unique owners. Audit proposes scope in the response; update uses explicitly approved targets; only commit confirms and persists cursors/sidecars.
3. Read [document lifecycle](references/document-lifecycle-contract.md) and classify each affected document as add/update/delete/merge/keep/propose-only. Whole-file deletion and protected knowledge remain separately authorized; audit only reports proposals.
4. Load only the relevant writing branch: README uses [README contract](references/readme-contract.md) and [writing guide](references/readme-writing-guide.md); CHANGELOG uses [changelog contract](references/changelog-contract.md); agent handbooks use [agents contract](references/agents-contract.md). Handbook mode defaults to incremental; missing handbook, topology change or explicit user request selects rebuild.
5. For Agent-consumed instructions or pointers, read [agent writing](references/agents/agent-writing.md). Preserve source ownership, activation boundaries, required quantities and validation; do not shorten by removing safeguards. Project prose defaults to simplified Chinese, README.md remains English, CHANGELOG follows the existing language; do not translate code/URLs/versions.
6. Verify factual changes and applicable project checks, reread output, and report input SHAs, dirty-source limitations, scope, actual effects, verification and blockers. Use [report shape](assets/report-template.md); audit returns it without writing, update marks `not-committed` and does not advance state, commit additionally returns [state](assets/state-template.json) and [workflow scope](assets/workflow-scope-template.json) for the owning command to commit and reread.

## Stop and return

Missing scope, source ownership, required reference, permission, validation or recovery evidence stops the affected write set. Do not fabricate completion or clean unrelated work. A report and a green structure check are not proof that the underlying documentation is correct. Return results to the declared caller; do not create an independent Skill state tree.
