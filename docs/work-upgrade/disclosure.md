# Document dependency and read audit

`validate-workflow-disclosure.mjs` retains the passive activation, memory gate and
narrow-read checks, but does not require each Work to repeat a particular heading
or the same startup paragraph. It also builds a potential-reference graph from
the maintained workflow/skill/command/authoring sources.

```bash
node scripts/validate-workflow-disclosure.mjs
node scripts/validate-workflow-disclosure.mjs --json --changed template/workflows/specdev/S-spec/S-spec.md
node scripts/validate-workflow-disclosure.mjs --json --trace /isolated/trace.jsonl --profile /isolated/read-profile.json
```

A read profile has optional `required` and `forbidden` arrays of normalized
repository-relative paths. It is an experiment assertion, not a workflow policy
or a second state source. Forbidden directories match descendants, not unrelated
names with a similar prefix.

The graph records source lines and trigger wording, resolves Path root aliases
and Markdown file links, checks targets and Work discovery reachability, and
reports reverse-transitive callers and relevant generators. Runtime and dynamic
paths are distinguished from static files. Source symlinks remain unchanged;
out-of-repository targets are rejected. Book/research corpora are inventoried as
evidence, not recursively loaded as instructions. Existing template/canonical
files remain generated output, outside the source graph.

Cycles are potential navigation/reference cycles, not proof of recursive model
execution. Unlinked candidates may be reached from code, directory discovery or
runtime paths. Neither report authorizes deleting a file. Review every deletion
against callers, code consumers, compatibility and the generator. Empty branch
triggers and missing targets are errors; conditions inferred from natural
language are audit hints, not a semantic verifier.

Actual read accounting consumes `context` events with `payload.path`, optional
`sha256`, `start_line`/`end_line` (1-based inclusive), and `phase`:
`discovery`, `activation`, or `branch`. It de-duplicates overlapping ranges across
phases, assigning a line to its first observed load. A tool event with
`payload.action: "effective"` explicitly identifies the first effective action;
without it the before-action measurement is unknown, not guessed. Unknown paths
are reported without opening them, so the audit cannot fetch secrets merely
because a trace names them. A supplied trace remains unauthenticated; use the
[independent observed gate](evaluation.md) for trusted provenance.

Report whole-source and entry character/byte changes separately from observed
read costs. These are not model tokens, usage bills or a quota-saving estimate.
