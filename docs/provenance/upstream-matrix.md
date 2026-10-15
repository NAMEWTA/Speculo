# Upstream disposition matrix

Revision: f3fc5632f401156837ee3872f14fe33ccf1024ea (checked 2026-10-08); prior source revision unknown. File hashes are inventory evidence, not semantic fidelity.

| Skill | Decision | Destination | Rationale |
|---|---|---|---|
| ask-matt | adapted | template/workflows/specdev/common/rules/workflow-routing.md | Use resumable Work routing and phase handoff, without model-specific context thresholds. |
| code-review | adapted | template/workflows/specdev/specdev-c-code-review/SKILL.md | Keep two review axes and persistent evidence, without arbitrary output caps. |
| codebase-design | adapted | template/workflows/specdev/common/rules/codebase-design.md | Shared design guidance; retain local paths and durable contracts. |
| diagnosing-bugs | adapted | template/workflows/specdev/specdev-d-diagnose-bugs/SKILL.md | Require landed mutation, expected red, redaction and restored baseline. |
| domain-modeling | adapted | template/workflows/specdev/common/rules/domain-modeling.md | One shared domain/ADR contract; permanent writes remain A-owned. |
| grill-with-docs | adapted | template/workflows/specdev/specdev-g-grill-with-docs/SKILL.md | Persist design tree, log, context and accepted decisions. |
| implement-spec | adapted | template/workflows/specdev/specdev-p-goal-plan/SKILL.md | Use existing Lead/frontier and integration gates; no automatic push, merge or cleanup. |
| implement | adapted | template/workflows/specdev/specdev-i-implement/SKILL.md | Preserve Ready, ownership and durable Evidence. |
| improve-codebase-architecture | adapted | template/workflows/specdev/specdev-r-review-architecture/SKILL.md | Separate review from selected design and implementation. |
| pr | adapted | template/workflows/specdev/specdev-t-triage/references/pr-delivery-protocol.md | Summary/evidence/before-after/merge risk with durable authorized delivery. |
| prototype | adapted | template/workflows/specdev/specdev-p-prototype/SKILL.md | Add offline logic and explicit project preview; retain UI default 3/max 4. |
| research | adapted | template/workflows/specdev/common/skills/research/SKILL.md | Return evidence to caller-owned artifacts. |
| retro | adapted | template/workflows/specdev/specdev-r-retro/SKILL.md | Separate development retrospective, reusable analysis and Speculo product feedback. |
| setup-matt-pocock-skills | adapted | template/workflows/specdev/specdev-i-init-setup/SKILL.md | Use existing initialization and project standards, no duplicate installer. |
| tdd | adapted | template/workflows/specdev/specdev-i-implement/references/tdd-rules.md | Preserve behavior-first red-green, independent expected values and landed mutation proof. |
| to-spec | adapted | template/workflows/specdev/specdev-s-spec/SKILL.md | Synthesize accepted decisions and verified prototype behavior. |
| to-tickets | adapted | template/workflows/specdev/specdev-t-tickets/SKILL.md | Keep vertical slices, expand-contract, dependencies and path ownership. |
| triage | adapted | template/workflows/specdev/specdev-t-triage/SKILL.md | Full Issue/PR intake with local authority and isolated remote ledgers. |
| wayfinder | adapted | template/workflows/specdev/specdev-w-wayfinder/SKILL.md | Retain one investigation per session and persistent claims. |
| wizard | excluded |  | No separate shell-specific execution wizard; owning Work contracts already route and authorize actions. |
| chief-of-staff | excluded |  | No new recurring orchestration or default delegation. |
| claude-handoff | excluded |  | Shell/host-specific background launching not adopted; use existing handoff contract. |
| loop-me | excluded |  | No autonomous persistent loop or scheduler introduced. |
| setup-ts-deep-modules | adapted | template/commands/engineering-standards-builder/references/rules/09-mechanical-guardrails.md | Evidence-based public/private dependency constraints with pass/fail/pass checks. |
| writing-beats | excluded |  | Independent creative writing workflow is outside scope. |
| writing-fragments | excluded |  | Independent creative writing workflow is outside scope. |
| writing-shape | excluded |  | Independent creative writing workflow is outside scope. |
| git-guardrails-claude-code | excluded |  | Regex command matching is not an authorization or containment boundary. |
| migrate-to-shoehorn | excluded |  | Framework-specific migration is outside the selected SpecDev upgrade. |
| scaffold-exercises | excluded |  | Exercise scaffolding is not a new SpecDev responsibility. |
| setup-pre-commit | adapted | template/commands/engineering-standards-builder/references/rules/09-mechanical-guardrails.md | Inspect existing guardrails; no implicit dependency or hook installation. |
| grill-me | adapted | template/workflows/specdev/specdev-g-grill-with-docs/SKILL.md | Fold interview/clarification into the existing design Work. |
| grilling | adapted | template/workflows/specdev/specdev-g-grill-with-docs/SKILL.md | Merge clarification without a duplicate entry. |
| handoff | adapted | template/commands/handoff/COMMAND.md | Preserve source pointers, owner, checkpoints and unresolved actions. |
| teach | excluded |  | Learning owns structured courses, practice and review; L-learn explains requirements references, project code, changes and external material. |
| to-questionnaire | adapted | template/workflows/specdev/specdev-g-grill-with-docs/SKILL.md | Reuse durable questionnaires in design clarification. |
| wait-what | adapted | template/workflows/specdev/specdev-g-grill-with-docs/SKILL.md | Clarify only consequential ambiguity and retain current goal. |
| writing-for-agents | adapted | template/references/writing-for-agents/writing-contract.md | Unified authoring, fidelity and host-specific invocation profiles. |
