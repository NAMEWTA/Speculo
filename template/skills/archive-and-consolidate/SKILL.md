---
name: archive-and-consolidate
description: Archive and consolidate completed workflow changes and knowledge; use only for an explicitly selected archive/consolidation or cleanup review.
metadata: {"speculo-id": "archive-and-consolidate", "speculo-kind": "skill", "speculo-legacy-name": "Archive and Consolidate"}
---

# Archive and Consolidate

This file is the routing entry. Read [`references/entry-procedure.md`](references/entry-procedure.md) only after this skill is selected. Read a named reference there only for the active branch.

## Scope

- Trigger: Archive and consolidate completed workflow changes and knowledge; use only for an explicitly selected archive/consolidation or cleanup review.
- Output and write owner remain those declared by the entry procedure and the owning command/workflow.
- Do not infer missing scope, credentials, target, or authorization.

## Stop

Stop before side effects when the required input, owner, reference, confirmation, schema, or recovery evidence is missing, or when `commands_root` is not `{roots.state}/commands`; report the exact blocker and preserve any dry-run evidence.
