# Speculo Runtime Kernel

The kernel is the provider-neutral persistence contract shared by every workflow.

- `events.jsonl` is append-only and records transitions, tools, approvals and evidence.
- `context/checkpoint.json` is the minimum recovery input after compaction or session loss.
- `capabilities.json` is a model/tool/sandbox capability snapshot captured at run start.
- `trace/` stores immutable run traces used by offline scenario evaluation.

Workflow packages declare stages and domain artifacts; they do not redefine lifecycle, risk, approval, or recovery semantics.
