---
id: upstream-fork-sync
type: skill
name: upstream-fork-sync
description: Assess a requested fork/upstream checkpoint and produce reproducible diff, conflict, and customization-risk evidence.

---

# upstream-fork-sync

This file is the routing entry. Read [`references/entry-procedure.md`](references/entry-procedure.md) only after this skill is selected. Read a named reference there only for the active branch.

## Scope

- Trigger: Assess a requested fork/upstream checkpoint and produce reproducible diff, conflict, and customization-risk evidence.
- Output and write owner remain those declared by the entry procedure and the owning command/workflow.
- Do not infer missing scope, credentials, target, or authorization.

## Stop

Stop before side effects when the required input, owner, reference, confirmation, schema, or recovery evidence is missing; report the exact blocker and preserve any dry-run evidence.
