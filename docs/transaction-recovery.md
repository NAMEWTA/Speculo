# Versioned refresh snapshots and recovery

Applies to the CLI-owned init/refresh journal, not to OPS execution approvals or
workflow state schemas. See also [the audit fix record](audit-fixes-2026-10-07.md).

## New transactions

New journals use `schema_version: 2`. `before` is `absent` or a tagged snapshot;
`after` is a tagged snapshot. Tags are `tree-v2-posix:<sha256>` and
`tree-v2-windows:<sha256>`. They are not interchangeable with v1 bare hashes.

The hash covers root and directory existence (including empty directories),
node type, file bytes, and symlink target text without following links. POSIX
snapshots additionally include permission and special bits (`mode & 07777`).
Windows snapshots do not claim to capture POSIX permissions, ACLs, ownership or
extended attributes. Existing Windows credential-refresh restrictions remain.
The managed-file manifest and domain/runtime schemas are unchanged.

The same snapshot algorithm gates staging drift, commit checkpoints, rollback,
and committed cleanup. A drift failure preserves the active data and any durable
transaction, stage and backup needed for diagnosis. External handbook images
retain their separate byte/mode checks. These checks operate in a trusted project
directory with cooperating writers; they are not an atomic filesystem snapshot
or a substitute for OS-level isolation against an adversarial concurrent writer.

For v2 recovery, run read-only `speculo doctor` first. Verify the transaction ID,
original host and stopped owner. `speculo recover <project> --transaction <id>`
refuses an active owner, foreign host, foreign snapshot profile, invalid journal,
or any before/after mismatch. Do not remove a lock to make a failed check pass.

## Existing v1 journals

v1 journals remain recognizable by `readTransaction` and read-only doctor. They
cannot prove that modes or directories stayed unchanged. The new executor
therefore returns `legacy-transaction-snapshot` **before writing any recovery
marker, moving directories, rewriting the journal or cleaning residues**. This
applies to all phases, including `committed` and `rolled-back`.

Do not relabel a v1 journal as v2, fabricate a replacement fingerprint, erase its
lock, or blindly retry with an older binary. First stop the original writer on
the original host; preserve a separate complete copy of the journal, owner,
active tree, stage, backup and external handbooks, including metadata. Compare
those copies with independently verified pre-operation backup/permission and
directory evidence. An operator must approve a recovery plan for the proven
layout; when that evidence is absent, keep recovery blocked. This patch does not
supply an automatic legacy migration because the omitted information cannot be
recovered from a bare content hash. Existing files and historical bytes remain
untouched. Finish in-flight v1 transactions before upgrading where practical.
