# Issue #96: Agent-led coordination implementation plan

## Scope and evidence

Baseline: `7b204afa20e391d10c59e20a078a5757ed164f6a` (2.1.13), inspected 2026-10-28.
Authority: [Issue #96](https://github.com/NAMEWTA/Speculo/issues/96) and the maintainer's explicit implement-and-open-PR request. This plan does not authorize merging, releasing, installing external harnesses, changing privileges, or paid model evaluations.

The [Anthropic article](https://claude.com/resources/articles/building-agents-when-to-fold-subagents-into-your-main-agent-loop) recommends examining context coupling and task outcomes before folding specialists into skills/tools. Independent verification, genuinely parallel contexts and distinct capabilities remain reasons to delegate. We apply that decision principle, not the article's deployment-specific speed/cost claims.

The [single-agent-loop-kit](https://github.com/anthropics/single-agent-loop-kit) provides an audit/baseline/merge/fold/as-tool/evaluate method and explicitly separates offline plumbing checks from model-quality measurements. We reuse that method conceptually, not its application runtime or unmeasured performance conclusions. No upstream code is copied.

## Design decisions

1. The Lead retains context and responsibility. Work boundaries, worker count, workspaces and execution channels are separate dimensions. Direct work and parallel ordinary tools are first-class outcomes.
2. The coordination resolver remains a read-only decision/validation helper. Required current instructions and approved phase choices outrank preferences. Capability configuration limits choices but is not authorization. Only the chosen external capability is checked; no eager installs, logins, service starts or recursive worker delegation.
3. Review content and reviewer identity are separate. Both applicable standards/specification axes remain. Low-risk work can self-check the actual frozen delivery. High-risk or explicit independent-review obligations still require a genuinely different implementer/reviewer identity, readable evidence and current inputs. An Evidence declaration cannot lower upstream risk or explicit independence.
4. Required user/safety/acceptance methods retain pins and actual execution evidence. Optional knowledge is progressively discovered without a Map replan or full catalogue hash scan. Path safety and consequential deviations remain enforced.
5. Parent graphs may express valid draft/deferred consumers. Per-node readiness, dependency success, writer ownership, shared resources and global gates decide execution. A cancelled prerequisite is never success.
6. Scheduling exposes all eligible candidates, pairwise conflicts and a suggested batch. The suggestion is not authorization, a sole legal order, or a worker assignment.
7. Short synchronous read-only delegation may return correlated structured results directly. Durable sessions retain TASK/REPORT/checkpoints when interruption, asynchronous work, writes or formal delivery require them. Unknown side effects are queried before redispatch.
8. Goal escalation requires persistent coordination, recovery, shared writers/resources or cross-task integration gates, not mere read-only parallelism.

## Implementation slices

| Slice | Authoritative source | Verification |
|---|---|---|
| Coordination and handoff | `src/coordination.ts`, shared coordination references, dispatch validator, command, Herdr Skill | direct/tools/delegate, required/preferred, denied/unavailable route, inline vs durable handoff, no implicit side effects |
| Review policy | review evidence validator, execution context, completion validator, schemas/templates and I/C methods | low-risk self review, high-risk and explicit independent blocks, identity/frozen-input/stale-final-delivery negatives |
| Skills and planning | plan-contract, Ticket schema/template, Map validator, T/P/I methods | optional discovery/drift accepted, required method drift/missing evidence rejected, path traversal rejected |
| Progressive parent graph and scheduler | parent validator, ticket-control, parent planning and execution policy references | Ready producer plus draft consumer, cancelled dependency, conflicts, alternate legal batch, immutable checkpoint/read-only state |
| Distribution and evaluation | actual template owners and generation scripts, existing test/fixtures | canonical/runtime generation twice, source parity, full test/assets/package/bin/Node CI matrix |

One implementation branch and PR integrate the slices. Existing business owners and Ticket/Goal/Evidence remain the state authority. Changes are made at source; generated files are rebuilt, never hand-patched. Existing saved user runtime artifacts are not rewritten.

## Behavioral acceptance matrix

The 16 entrance scenarios requested in Issue #96 are mapped below. **Deterministic coverage is not a complete real-host entrance run.** The new `test/fixtures/agent-led-scenarios.json` has 19 host-observation cases with executable event, artifact and forbidden-effect assertions. `test/agent-led-evaluation.test.ts` exercises their positive/negative evaluation contracts with explicitly synthetic data (20 tests); it does not execute an Agent, authenticate exported decisions or measure model quality. Every host case remains `not-evaluated` until actual traces/artifacts and the existing independent observer gate are supplied.

| Issue entrance | Deterministic executable coverage | Host-observation fixture suffix (all unobserved) |
|---|---|---|
| ① Single Agent small edit | `specdev-risk-review.test.ts`: complete entry accepts low-risk self review without Ticket/Goal/session; `coordination-autonomy.test.ts`: direct work needs no delegate or probes | `low-risk-self-review` |
| ② Single Agent successive Tickets | `coordination-autonomy.test.ts`: successive direct work resolutions; `specdev-plan-contract.test.ts`: reads/resumes Ticket progress without rewriting Map or Goal. This checks resolver/state contracts, not a model completing several tickets | `single-agent-multiple-tickets` |
| ③ Ordinary parallel tools | `coordination-autonomy.test.ts`: `parallel-tools` resolution has no delegation or capability probes. Actual parallel search/tool execution remains unobserved | `parallel-ordinary-tools`, `none-ordinary-tools` |
| ④ Native Subagent independent research | `coordination-autonomy.test.ts`: authorized native proposal and bounded inline return validation. Actual independent research remains unobserved | `host-native-authorized` |
| ⑤ CLI asynchronous writes and collection | `coordination-autonomy.test.ts`: async/effects cannot use inline handoff; `coordination-shared.test.ts`: durable return identities and replay guards. No actual external CLI writer is run | `cli-async-write-recovery` |
| ⑥ Orca/Herdr capability choice and fallback | `coordination-autonomy.test.ts`: available proposals and allowed fallback with injected capability checker, not real providers | `capability-fallback` |
| ⑦ Required tool forbids fallback | `coordination-autonomy.test.ts`: required request/approved stage unavailable blocks and cannot silently switch | `required-tool-no-fallback` |
| ⑧ Low-risk self review completion | `specdev-risk-review.test.ts`: actual completion validator with disposable self-review evidence; review policy tests check applicable axes | `low-risk-self-review` |
| ⑨ High-risk independent review blocked/passed | `specdev-risk-review.test.ts` and distributed `review-policy.test.mjs`: required independence cannot be downgraded; independent fixture accepted | `high-risk-independent-review`, `high-risk-review-unavailable` |
| ⑩ Snapshot invalidated after fixes | Distributed `review-evidence.test.mjs`: changed code, sources and final HEAD invalidate review, unrelated reports do not | `review-snapshot-stale` |
| ⑪ Ready parent producer plus draft consumer | `specdev-change-workspace.test.ts`: parent validation and analyzer permit producer, exclude draft, reject prematurely active consumer, keep final gate closed | `progressive-parent` |
| ⑫ Shared resource conflicts | `specdev-change-workspace.test.ts`: writable path and semantic resource conflicts reject overlapping writers; static eligibility is not transaction/authorization approval | `local-blocker-isolation`, `global-transaction-blocker` |
| ⑬ New Skill discovered on demand | `specdev-plan-contract.test.ts`: new optional Skills need no replan/pin/catalog scan; required pins and execution records remain enforced. Workspace checkpoint test distinguishes optional/required digest drift | `optional-skill-missing`, `required-skill-missing` |
| ⑭ Cross-session TASK/REPORT recovery | `coordination-shared.test.ts`: durable task identity, return/replay and cross-workflow chain validation. Actual host restart and checkpoint recovery remain unobserved | `cross-session-handoff` |
| ⑮ Unknown long-running result is not redispatched | `coordination-autonomy.test.ts`: correlated return cannot turn idle/unknown into completion; shared return guard rejects replay. Long-running external side effects remain unobserved | `unknown-result-reconcile` |
| ⑯ Suggested batch is not unique | `specdev-change-workspace.test.ts`: both conflicting ready nodes eligible, T-01 suggested, actual T-02 start accepted; active ownership then excludes T-01 | `alternate-legal-batch` |

`eligible` means static candidate readiness only: the analyzer explicitly reports `authorization_checked: false` and `transaction_gateway_checked: false`. Actual dispatch still requires current authorization and transaction gates; a static candidate is never an authorization grant. Draft nodes, unresolved dependencies and known local/global blockers cannot become executable merely by appearing in a suggested batch.

Local verification for this matrix: `node --experimental-transform-types --test test/agent-led-evaluation.test.ts` passed 20/20; `node --experimental-transform-types --test test/specdev-plan-contract.test.ts test/specdev-independent-review.test.ts` passed 35/35. The workspace suite passed 19/19 using a temporary source-only import extension substitution. The remaining linked suites and final-head checks are reported separately by integration/CI; their presence in this table is not a claim that a real host ran them. No keyword check is counted as behavioral evidence.

## Verification and reporting

Run relevant tests during implementation, then the repository's `pnpm check`, `pnpm validate-source-parity`, `pnpm verify-bin`, `pnpm verify-generated` and `pnpm verify-package`, including normal/failure/recovery paths and the exact final PR head CI. Record actual failures and repairs, not only successful subsets.

This repository distributes methods and deterministic validators rather than an autonomous model harness. Its contract tests can establish structural and executable guard behavior; they cannot prove a particular model will choose well, call real CLI/Orca/Herdr tools correctly, reduce tokens or improve success rate. Real-model/host comparison remains explicitly unverified unless run with approved credentials, budgets and fixed tasks. Do not count simulated traces or keyword tests as observed model evidence.

For future authorized before/after observations, keep identical tasks/model/environment, record final AC outcomes and side effects, calls/tokens/cost/latency, workers/handoffs, recovery/conflicts and adjacent-task regressions. Preserve independent-subagent cases. Missing observations remain missing, not zero-cost successes. Existing evaluation tooling and evidence ownership should be reused; no new Run/Worker state machine is introduced.
