# Fixes for the 2026-10-07 audit

Source baseline: `main@f47d0341fa2f005bbb6a69f3261ce2e16f8e69c2`.
Scope: R1/R2/R3 and their original four red regressions. No version publication,
production deployment, branch cleanup or workflow state migration is included.

## R1: metadata and directory drift

`fingerprintTree` now produces versioned type/directory/content snapshots with
POSIX modes. New CLI journals are v2; legacy v1 journals are recognized but
explicit recovery stops without mutation. Commit checkpoint checks and rollback/
cleanup use the same profile. Details and legacy recovery requirements are in
[transaction-recovery.md](transaction-recovery.md).

Regression coverage includes staging-time file-mode and empty-directory changes;
metadata changes at prepared, old-renamed, installed, external-finalized and
committed checkpoints; explicit recovery refusal with unchanged evidence; legacy
phases and unknown/foreign snapshot versions; normal interrupted recovery; and
unchanged external-file ownership protections. POSIX-mode assertions are skipped
on Windows, not represented as ACL verification.

## R2: configuration keys are JSON data

Three-way merge tests membership with `Object.hasOwn`. Properties are defined as
own data properties, including `__proto__`, rather than assigned via inherited
setters. Existing known-default updates, local overrides, unknown-field policy,
explicit removals, type conflicts and targeted backups keep their semantics.
Allowed special keys and nested objects survive serialization; no global
prototype is changed. Disallowed keys are counted as removals, not silently lost.

## R3: actual instruction inputs are bound to source

The signature/trust model and artifact/negative-effect gates are unchanged.
Every consumed instruction must be present in the signed inventory, and every
context read must have a canonical repository-relative path and SHA-256 of its
actual bytes. The verifier binds each instruction to both its on-disk bytes and
the regular Git blob at the signed commit, not merely the HEAD string. Git
replacement objects are disabled for these lookups. Symlinks, untracked or dirty
instructions, staged-only edits, mismatched casing/paths and missing digests fail
closed. Repository input must be the Git worktree root. Byte-changing checkout
filters/line-ending conversions require a byte-identical source checkout; the
verifier does not silently normalize evidence. Unrelated references are not
required to be read or signed.

Observation payload v2 adds `role: instruction | data` to each context payload.
The outer envelope, trust-file schema and normalized event schema remain v1.
`role: data` binds ordinary business input bytes through the signed trace and
current source file, without treating them as executable instructions or requiring
them to be committed. A listed or scenario-required instruction cannot be
relabeled as data. The independent collector owns truthful role classification;
the verifier cannot determine the semantics of arbitrary text by itself.

Historical observation payload v1 remains supported conservatively: an untyped
context read is an instruction and requires inventory coverage and a byte digest.
No data-role exception is accepted in v1. Incomplete older observations must be
re-exported by the trusted observer, not re-signed by the workload. Dirty-source
snapshot formats are not implemented; commit the source and produce a fresh
observation instead. Synthetic test signatures are never real Agent evidence.

## Validation and limitations

The original audit reproduction file was run unchanged: four failures before the
fix, four passes after it. Additional regression assertions live in the existing
`test/config.test.ts`, `test/review-installation.test.ts` and
`test/review-evaluation.test.ts` entry points. Both review files already run in
Windows smoke CI; no CI permissions, workflow exports or release jobs are added.

Local development uses the supplied offline asset/dependency snapshot, whose
entire `src` subtree matches the frozen main tree; the evidence module and modified
evaluation test baseline are fetched from main and checked against Git blob IDs.
Local results are not labeled as a fresh exact-main build. The PR's existing CI
runs the exact complete candidate with locked dependencies, source/asset checks,
CLI checks and reproducible canonical generation on the declared platforms.
Inspect that run and the PR verification comment for final results.

Passing these regressions establishes these fixes, not universal correctness or
real model/host performance. There was no production data access, live OPS action,
real Agent/model A/B, or new package publication during this repair.
