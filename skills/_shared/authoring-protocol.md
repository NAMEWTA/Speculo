# Authoring protocol

Use this short protocol for Speculo maintainer changes. The asset-specific contract remains authoritative for fields and lifecycle rules.

1. Search the target entry, callers, generated outputs, and validation scripts before reading detail.
2. Keep the entry as a router: trigger, scope, required inputs, required references, outputs, owner, stop conditions, and validation.
3. Read branch references only when their branch is active. Put long examples, schemas, command flags, and templates in references/assets.
4. Maintain one owner for each rule, state namespace, report, generated block, and runtime write.
5. After editing, regenerate owned indexes/canonical files, reread the changed entry and references, and run the smallest meaningful normal and failure checks before broader project gates.

## Fidelity gate

Before changing any document, read `template/skills/writing-great-skills/references/document-contract.md` from the repository root. Preserve explicit deliverable counts, default tools, permission boundaries, validation and failure stops. Back up canonical user-owned sources; preserve links and metadata. Describe actual behavior differences and whole-source character changes, including extracted references; do not infer token/quota savings.
