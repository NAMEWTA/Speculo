---
schema_version: 1
artifact: implementation-plan
change: <YYYY-MM-DD-parent-topic>
status: ready
source_map_revision: 1
orchestration: lead-directed
lead: <owner-or-session-locator>
implementation_agent_limit: 3
integration_attempt_limit: 3
ticket_workspace_policy: current
integration_gate: direct-parent
ready_for_execution: true
---

# Implementation Plan: <Outcome>

## 1. Outcome and Authority

- Outcome: <aggregate implementation outcome>
- Lead: <recoverable owner/session locator>
- False completion: <what must not be called done>
- Authority: child Spec/Tickets for behavior and implementation; parent Map/Plan for cross-change execution only.

## 2. Ready Frontier and Waves

| Wave | Composite tasks | Dependency Gate | Serialization/resource Gate | Status |
|---|---|---|---|---|
| 1 | pending | dependencies satisfied | locks available | ready |

## 3. Workspace and Dispatch Contract

- Ticket workspace policy: current / required.
- Dispatch IDs use `<member-change>::<ticket-id>`.
- The implementation agent limit is global across all members; the Lead is not counted.
- Read-only review/research/test-observation agents do not consume the implementation limit.

## 4. Repository Integration Queue

| Repository/ref | Ordered composite tasks | Current parent checkpoint | Active candidate | Owner |
|---|---|---|---|---|
| current repository/current ref | pending | pending-read | none | Lead |

## 5. Gates and Aggregate Verification

| Gate | Required tasks | Verification | Evidence | Status |
|---|---|---|---|---|
| child completion | all child Tickets | child completion contract | child Evidence | pending |
| aggregate | all members completed | full suite and applicable E2E | parent Evidence | pending |

## 6. Conflict, Drift and Recovery

- Re-read Map revision, Lead epoch, child Tickets, Git HEAD, active dispatches and locks before every action.
- Any parent advance makes older candidates stale and requires reconstruction.
- On pause, persist last accepted task, stale candidates, blockers, next legal task and required reads.

## 7. Progress and Decisions

| Time | Composite task | Dispatch/result | Child Evidence | Parent checkpoint | Next recomputation |
|---|---|---|---|---|---|
| pending | none | not started | none | pending-read | compute frontier |
