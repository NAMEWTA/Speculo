---
name: git-history-squash
description: Plan and execute a confirmed first-parent Git history squash with recoverable refs and exact remote leases; never auto-trigger.
metadata: {"speculo-id": "git-history-squash", "speculo-kind": "skill", "speculo-invocation": "user-only"}
---

# git-history-squash

Activation is explicit-only. Metadata is descriptive; enforce host permissions and obtain user authorization before effects.

This file is the routing entry. Read [`references/entry-procedure.md`](references/entry-procedure.md) only after this skill is selected. Read a named reference there only for the active branch.

## Scope

- Trigger: Plan and execute a confirmed first-parent Git history squash with recoverable refs and exact remote leases; never auto-trigger.
- Owning command: `<Path>{roots.commands}/git-history-squash.md</Path>` owns confirmation and the command audit report.
- This skill owns `<Path>{roots.state}/skills/git-history-squash/</Path>` transactional state.
- Output and write owner remain those declared by the entry procedure and the owning command/workflow.
- Do not infer missing scope, credentials, target, or authorization.

## Stop

Stop before side effects when the required input, owner, reference, confirmation, schema, or recovery evidence is missing; report the exact blocker and preserve any dry-run evidence.
