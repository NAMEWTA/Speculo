# Speculo Runtime Kernel

The kernel is the provider-neutral persistence contract shared by every workflow.

- `events.jsonl` is append-only and records transitions, tools, approvals and evidence.
- `context/checkpoint.json` is the minimum recovery input after compaction or session loss.
- `capabilities.json` is a model/tool/sandbox capability snapshot captured at run start.
- `trace/` stores immutable run traces used by offline scenario evaluation.

Workflow packages declare stages and domain artifacts; they do not redefine lifecycle, risk, approval, or recovery semantics.


OPS resource extension (v2 dispatch/checkpoint): subject.kind is controller, host, deployment or release, with a stable subject.id and run_id. Dispatch binds plan_digest. Other workflows retain schema v1/change_id. Checkpoint schema accepts both without converting legacy approvals. All OPS target mutations require exact plan approval, including local-reversible actions; the general riskRequiresApproval helper alone is not the OPS authorization gate.
