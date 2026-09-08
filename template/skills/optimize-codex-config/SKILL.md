---
name: optimize-codex-config
description: Audit config.toml/auth.json and diagnose Codex 413 or related failures; modify configuration only after explicit confirmation.
---

# optimize-codex-config

This file is the routing entry. Read [`references/entry-procedure.md`](references/entry-procedure.md) only after this skill is selected. Read a named reference there only for the active branch.

## Scope

- Trigger: Audit or diagnose the local Codex configuration and related failures; modify config only after an explicit confirmation.
- Mutation contract: show a redacted pre-optimize diff, obtain 明确确认, apply changes 原子地, and retain 恢复备份.
- Branch references: read `references/configuration-contract.md` for configuration changes and `references/troubleshooting.md` for 413/SSE/timeout/compaction diagnosis.
- Deterministic implementation: run `scripts/audit-codex-config.mjs` for the audit and pre-optimize checks.
- Output and write owner remain those declared by the entry procedure and the owning command/workflow.
- Do not infer missing scope, credentials, target, or authorization.

## Stop

Stop before side effects when the required input, owner, reference, confirmation, schema, or recovery evidence is missing; report the exact blocker and preserve any dry-run evidence.
