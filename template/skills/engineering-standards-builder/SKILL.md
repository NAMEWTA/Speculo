---
name: engineering-standards-builder
description: Generate or refresh project-specific engineering skills after the user explicitly invokes the builder.
disable-model-invocation: true
---

# engineering-standards-builder

This file is the routing entry. Read [`references/entry-procedure.md`](references/entry-procedure.md) only after this skill is selected. Read a named reference there only for the active branch.

## Scope

- Trigger: Generate or refresh project-specific engineering skills after the user explicitly invokes the builder.
- Output and write owner remain those declared by the entry procedure and the owning command/workflow.
- Do not infer missing scope, credentials, target, or authorization.

## Stop

Stop before side effects when the required input, owner, reference, confirmation, schema, or recovery evidence is missing; report the exact blocker and preserve any dry-run evidence.
