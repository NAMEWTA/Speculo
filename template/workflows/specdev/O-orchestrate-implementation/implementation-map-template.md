---
schema_version: 1
artifact: implementation-map
change: <YYYY-MM-DD-parent-topic>
status: ready
revision: 1
members: [<child-change-a>, <child-change-b>]
tasks: [<child-change-a>::T-01, <child-change-b>::T-01]
dependencies: []
serializations: []
---

# Implementation Map: <Outcome>

## 1. Members and Source Authority

| Change | Spec | Tickets Map | Change status | Role |
|---|---|---|---|---|
| `<child-change-a>` | ready | ready | active | delivery |
| `<child-change-b>` | ready | ready | active | delivery |

## 2. Composite Ticket Inventory

| Composite ID | Child Ticket | Status | Ready | Writable/shared summary | Contracts |
|---|---|---|---|---|---|
| `<child-change-a>::T-01` | T-01 | ready | yes | pending | pending |
| `<child-change-b>::T-01` | T-01 | ready | yes | pending | pending |

## 3. Implementation Super-DAG

| Edge | Kind | Source and reason | Start Gate | Evidence |
|---|---|---|---|---|
| none | none | independent until proven otherwise | n/a | n/a |

## 4. Conflict and Serialization

| Pair | Resource or overlap | Owner | Release condition |
|---|---|---|---|
| none | none observed | n/a | n/a |

## 5. Contract and Path Coverage

| Contract/shared surface | Producer task | Consumer tasks | Ordering/lock | Verification |
|---|---|---|---|---|

## 6. Revision Log

| Revision | Source change | Affected tasks/edges | Reason |
|---|---|---|---|
| 1 | initial Ready inputs | all | parent creation |
