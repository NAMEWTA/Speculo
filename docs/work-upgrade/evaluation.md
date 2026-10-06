# Evaluation evidence contract

This is maintainer validation, not a new workflow runtime. The authorized plan is
[plan.md](plan.md), F01/F02 and E1. Production servers and real runtime roots are
not fixtures.

## Three independent statements

| Invocation | Successful result means | Does not establish |
| --- | --- | --- |
| `pnpm eval:scenarios` | `fixture-ready`, definitions parsed | Any Agent behavior; `score` stays null |
| `pnpm eval:artifacts -- <fixtures> <trace.jsonl> <artifact-root>` | Supplied ordered events and actual artifact assertions passed | Tool provenance or completeness of negative effects |
| `pnpm eval:release -- <fixtures> --bundle <export> --trust <operator-keys.json> --repo <checkout>` | The same gates passed for an independently attested, source-bound observation | General correctness, semantic quality, or all models/hosts |

`eval:observed` is the same observed gate as `eval:release`. A missing trace,
untrusted observer, missing assertion, partial observation, mismatched source or
failed assertion is not release-eligible. `pnpm check` remains deterministic
source/fixture regression; its green status is never called an Agent eval.
The existing npm/tag release machinery is not silently granted credentials,
changed, or invoked by this refactor. Before a behavior-changing release, the
maintainer must run the observed gate against the selected complete suite.

The shipped broad scenario catalog is a coverage index, not scored behavioral
proof: cases without concrete `assertions.artifacts` remain `not-evaluated` even
with a signed trace. An experiment supplies its own frozen concrete fixture file,
including positive and negative cases, rather than converting expected prose
into an automatic pass.

## Export produced by the independent host observer

The host-side observer, outside the Agent's writable workspace, exports:

```text
export/
  observation.json       # signed envelope below
  trace.jsonl            # normalized events consumed by the existing scorer
  raw.jsonl              # redacted native observer log, bound by digest
  artifacts/
    <scenario-id>/...    # actual captured outputs; no symlinks
```

`trace.jsonl` uses the existing event vocabulary: `capability`, `context`, `tool`,
`transition`, `approval`, `evidence`. Each event contains `schema_version: 1`, a
strictly increasing contiguous `sequence`, a declared `scenario_id`, and an
object `payload`. Context reads include a canonical repository-relative `path` (no traversal,
absolute paths, backslashes or duplicate separators); tool
observations include actual `name`, `exit_code` and classified `effect`. Record
reads, failures and side effects, not just success summaries. `forbidden_reads`
assertions match exact paths or directory descendants, not similar prefixes.
A host-specific importer must normalize native events **before** the trusted
observer signs the canonical trace. This package does not invent Codex/Claude
native event formats or claim a model-written trace is native telemetry.

The JSON envelope has `key_id`, `payload` and a base64 Ed25519 `signature` over
UTF-8 `canonicalJSON(payload)` (exported by the evidence module). Payload fields:

```json
{
  "schema_version": 1,
  "kind": "speculo-host-observation",
  "run_id": "<unique actual run id>",
  "repetition": 1,
  "host": {"name": "<host>", "version": "<actual version>"},
  "model": {"name": "<model>", "version": "<actual version>"},
  "collector": {"name": "<independent observer>", "version": "<version>"},
  "started_at": "<ISO-8601>",
  "finished_at": "<ISO-8601>",
  "exit_code": 0,
  "coverage": {"reads": "complete", "effects": "complete", "artifacts": "complete"},
  "repository_commit": "<full commit SHA>",
  "fixture_sha256": "<sha256 of canonicalJSON(parsed fixtures)>",
  "trace_sha256": "<sha256 of canonicalJSON(parsed event array)>",
  "raw_log": {"path": "raw.jsonl", "sha256": "<redacted log byte digest>"},
  "instructions": [{"path": "<repository-relative instruction>", "sha256": "<byte digest>"}],
  "artifacts": [{"path": "<scenario-id>/<file>", "sha256": "<byte digest>"}]
}
```

Instruction coverage includes every scenario's declared `instruction_paths`,
plus the actual conditional references consumed. The artifact inventory includes
all regular files under `artifacts`, sorted by path. Extra files, changed bytes,
path traversal, symlink substitution, version drift and missing coverage fail.
Host/model metadata and the raw log are supplied by the independent observer,
not by the workload. The scorer verifies their binding and observer trust; it
cannot establish an external observer's honesty by itself.

## Trust and redaction

The evaluator operator supplies a file outside the repository, bundle and
artifact root, with schema version 1 and `observers` entries containing unique
`id`, PEM Ed25519 `public_key` and allowed `hosts`. It must not be writable by the
Agent. No signing key or default trusted observer is shipped. Merely moving a
key file outside the tree is not an OS sandbox: the operator must enforce this
separation in the host or CI environment. Unit tests generate ephemeral test
keys and explicitly use a synthetic `no-model` fixture; these tests are **not**
real model observations and are not release evidence.

Redact secrets in the observer before export and hashing. Retain source IDs,
command shape, actual exit status and the signal needed by assertions, not
credential values, complete reasoning traces, unrelated documents or raw env.
These readers do not run a model, execute deployment commands, create remote
issues, sign evidence, or modify workflow state.

## Comparing revisions

Freeze fixtures and tool/host/model versions. Run each selected case repeatedly
on baseline and candidate, with distinct run IDs/repetition numbers. Save the
full JSON gate result, sample count, individual failures and observed read
paths. Use the disclosure report for de-duplicated characters/bytes; use actual
provider usage for token/billing claims. Semantic review must separately assess
requirement coverage, readability and whether a stop was justified. Do not
average away any authorization, persistence or recovery failure.

D's proposed un-reproduced investigation relaxation remains an experiment until
comparable real observations satisfy the plan. A green synthetic verifier test
is not evidence for relaxing that gate.
