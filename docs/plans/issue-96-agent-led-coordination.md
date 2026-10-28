# Issue #96: Agent-led coordination implementation plan

## Scope and evidence

Baseline: `7b204afa20e391d10c59e20a078a5757ed164f6a` (2.1.13), inspected 2026-10-28.
Authority: [Issue #96](https://github.com/NAMEWTA/Speculo/issues/96) and the maintainer's explicit implement-and-open-PR request. This plan does not authorize merging, releasing, installing external harnesses, changing privileges, or paid model evaluations.

The [Anthropic article](https://claude.com/resources/articles/building-agents-when-to-fold-subagents-into-your-main-agent-loop) recommends examining context coupling and task outcomes before folding specialists into skills/tools. Independent verification, genuinely parallel contexts and distinct capabilities remain reasons to delegate. We apply that decision principle, not the article's deployment-specific speed/cost claims.

The [single-agent-loop-kit](https://github.com/anthropics/single-agent-loop-kit) provides an audit/baseline/merge/fold/as-tool/evaluate method and explicitly separates offline plumbing checks from model-quality measurements. We reuse that method conceptually, not its application runtime or unmeasured performance conclusions. No upstream code is copied.

## Design decisions

1. The Lead retains context and responsibility. Work boundaries, worker count, workspaces and execution channels are separate dimensions. Direct work and parallel ordinary tools are first-class outcomes.
2. The current Agent makes coordination choices using the shared contract; configuration validators check saved structure and do not select execution channels. Required current instructions and approved phase choices outrank preferences. Capability configuration limits choices but is not authorization. Only the chosen external capability is checked; no eager installs, logins, service starts or recursive worker delegation.
3. Review content and reviewer identity are separate. Both applicable standards/specification axes remain. Low-risk work can self-check the actual frozen delivery. High-risk or explicit independent-review obligations still require a genuinely different implementer/reviewer identity, readable evidence and current inputs. An Evidence declaration cannot lower upstream risk or explicit independence.
4. Required user/safety/acceptance methods retain pins and actual execution evidence. Optional knowledge is progressively discovered without a Map replan or full catalogue hash scan. Path safety and consequential deviations remain enforced.
5. Parent graphs may express valid draft/deferred consumers. Per-node readiness, dependency success, writer ownership, shared resources and global gates decide execution. A cancelled prerequisite is never success.
6. Scheduling exposes all eligible candidates, pairwise conflicts and a suggested batch. The suggestion is not authorization, a sole legal order, or a worker assignment.
7. Short synchronous read-only delegation may return correlated structured results directly. Durable sessions retain TASK/REPORT/checkpoints when interruption, asynchronous work, writes or formal delivery require them. Unknown side effects are queried before redispatch.
8. Goal escalation requires persistent coordination, recovery, shared writers/resources or cross-task integration gates, not mere read-only parallelism.

## Implementation slices

| Slice | Authoritative source | Verification |
|---|---|---|
| Coordination and handoff | shared coordination references, `src/coordination.ts` configuration validation, dispatch validator, command, Herdr/Orca Skills | configuration constraints and inline vs durable validation are executable checks; channel choice, lazy capability checks and actual fallback remain host-observation obligations |
| Review policy | review evidence validator, execution context, completion validator, schemas/templates and I/C methods | low-risk self review, high-risk and explicit independent blocks, identity/frozen-input/stale-final-delivery negatives |
| Skills and planning | plan-contract, Ticket schema/template, Map validator, T/P/I methods | optional discovery/drift accepted, required method drift/missing evidence rejected, path traversal rejected |
| Progressive parent graph and scheduler | parent validator, ticket-control, parent planning and execution policy references | Ready producer plus draft consumer, cancelled dependency, conflicts, alternate legal batch, immutable checkpoint/read-only state |
| Distribution and evaluation | actual template owners and generation scripts, existing test/fixtures | canonical/runtime generation twice, source parity, full test/assets/package/bin/Node CI matrix |

One implementation branch and PR integrate the slices. Existing business owners and Ticket/Goal/Evidence remain the state authority. Changes are made at source; generated files are rebuilt, never hand-patched. Existing saved user runtime artifacts are not rewritten.

## Behavioral acceptance matrix

The 16 entrance scenarios requested in Issue #96 are mapped below. **Deterministic coverage is not a complete real-host entrance run.** The new `test/fixtures/agent-led-scenarios.json` has 19 host-observation cases with executable event, artifact and forbidden-effect assertions. `test/agent-led-evaluation.test.ts` exercises their positive/negative evaluation contracts with explicitly synthetic data (20 tests); it does not execute an Agent, authenticate exported decisions or measure model quality. Every host case remains `not-evaluated` until actual traces/artifacts and the existing independent observer gate are supplied.

| Issue entrance | Deterministic executable coverage | Host-observation fixture suffix (all unobserved) |
|---|---|---|
| ① Single Agent small edit | `specdev-risk-review.test.ts`: complete entry accepts low-risk self review without Ticket/Goal/session. Actual Agent selection of direct work remains unobserved | `low-risk-self-review` |
| ② Single Agent successive Tickets | `specdev-plan-contract.test.ts`: reads/resumes Ticket progress without rewriting Map or Goal. This checks saved state contracts; a model completing several tickets remains unobserved | `single-agent-multiple-tickets` |
| ③ Ordinary parallel tools | Shared coordination and Goal sources permit ordinary parallel tools without delegation or Goal escalation. Source consistency is checked; actual parallel search/tool execution remains unobserved | `parallel-ordinary-tools`, `none-ordinary-tools` |
| ④ Native Subagent independent research | `coordination-autonomy.test.ts`: bounded inline return validation. Actual native capability selection, authorization and independent research remain unobserved | `host-native-authorized` |
| ⑤ CLI asynchronous writes and collection | `coordination-autonomy.test.ts`: async/effects cannot use inline handoff; `coordination-shared.test.ts`: durable return identities and replay guards. No actual external CLI writer is run | `cli-async-write-recovery` |
| ⑥ Orca/Herdr capability choice and fallback | `coordination-autonomy.test.ts`: saved preference schema; shared contract and provider entries define lazy capability checks and permitted fallback. Actual provider calls and fallback remain unobserved | `capability-fallback` |
| ⑦ Required tool forbids fallback | `coordination-autonomy.test.ts`: configuration rejects a required route with fallback. Enforcement of a required current instruction or approved phase choice during actual dispatch remains unobserved | `required-tool-no-fallback` |
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

Historical local verification during the initial implementation: `node --experimental-transform-types --test test/agent-led-evaluation.test.ts` passed 20/20; `node --experimental-transform-types --test test/specdev-plan-contract.test.ts test/specdev-independent-review.test.ts` passed 35/35. The workspace suite passed 19/19 using a temporary source-only import extension substitution. These counts do not describe the later review-fix head. Current integration results and exact-head CI are recorded in the fix PR; a linked test or source-consistency assertion is not evidence that a real host ran the scenario.

## Review corrections

The follow-up to [PR #97](https://github.com/NAMEWTA/Speculo/pull/97) fixes requirements that the first implementation did not carry through its actual entry points. It does not preserve obsolete restrictions or introduce another runtime coordinator.

| Review finding | Correction and verification |
|---|---|
| Completion still unconditionally demanded independent reviewers | Finalize, merge-conflict recovery, parent Evidence and governance sources now use the same risk-adapted review policy as I/C. Both applicable axes, frozen input and required independence remain enforced. Existing complete-entry and independent-review tests remain authoritative. |
| Orca's callable Skill still required an explicit user request or an existing Dispatch | The hub Skill and workflow activation sources allow a first dispatch selected by the current Agent within existing authorization and real capability. Ownership transfer and required-route boundaries remain. Source consistency is checked; real Orca execution remains unobserved. |
| Later risk invalidated all historical CRs | Historical records validate their original inputs, identity and results; the currently adopted report must satisfy current risk, independence and source freshness. Full `validateChange` regressions cover policy escalation, historical corruption and current-report selection across CR-999/CR-1000. |
| Malformed Skill fields crashed the entire controller | Ticket hashing and invocation coverage reject malformed values locally without traversing them as arrays. Regressions cover draft and Ready errors, dependent blocking, independent candidates and recovery after repair. Invalid values remain invalid and participate in the contract digest. |
| T/P entries still required optional Skill pins and scan rituals | Ticket and plan-review sources distinguish required methods from optional knowledge; an empty optional selection needs no catalogue scan proof. Contract tests retain required-method pins, evidence and path checks. |
| Lightweight Goal still excluded all real parallelism | Lightweight sources allow bounded parallel work; escalation depends on persistent dependencies, recovery, shared writers/resources or cross-task gates. Source assertions check the actual templates and planning entry, not model behavior. |
| Goal delegation still forced external TASK/REPORT | Goal orchestration and user handoff docs choose inline or durable handoff by recovery and audit needs. Existing inline/durable validator tests remain; cross-session host recovery remains unobserved. |
| User docs retained the removed workspace model | User guides and initialization sources describe current/worktree as a change-level choice, allow disjoint authorized writers, coordinate shared resources/Git operations and remove per-unit source/candidate worktrees. |
| Unused coordination resolver overstated runtime coverage | The unconsumed helper, its types and helper-only tests are removed. Real configuration and dispatch validators remain; the acceptance matrix now distinguishes their executable coverage from unobserved host selection. |

## Verification and reporting

Run relevant tests during implementation, then the repository's `pnpm check`, `pnpm validate-source-parity`, `pnpm verify-bin`, `pnpm verify-generated` and `pnpm verify-package`, including normal/failure/recovery paths and the exact final PR head CI. Record actual failures and repairs, not only successful subsets.

This repository distributes methods and deterministic validators rather than an autonomous model harness. Its contract tests can establish structural and executable guard behavior; they cannot prove a particular model will choose well, call real CLI/Orca/Herdr tools correctly, reduce tokens or improve success rate. Real-model/host comparison remains explicitly unverified unless run with approved credentials, budgets and fixed tasks. Do not count simulated traces or keyword tests as observed model evidence.

For future authorized before/after observations, keep identical tasks/model/environment, record final AC outcomes and side effects, calls/tokens/cost/latency, workers/handoffs, recovery/conflicts and adjacent-task regressions. Preserve independent-subagent cases. Missing observations remain missing, not zero-cost successes. Existing evaluation tooling and evidence ownership should be reused; no new Run/Worker state machine is introduced.
