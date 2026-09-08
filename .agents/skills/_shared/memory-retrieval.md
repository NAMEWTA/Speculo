# Memory retrieval and write gateway

Use this protocol whenever a workflow, command, skill, or work needs durable knowledge or memory.

1. Identify the request topic, scope, stable ID, and the evidence type needed.
2. Read the smallest available index, catalog, or status projection and locate matching entries by ID, topic, scope, or provenance.
3. Read only the selected entry and the minimum source/provenance anchors needed to answer or validate the request. Do not read an entire index, archive, or knowledge tree by default.
4. If no entry matches, report the missing evidence and stop the dependent decision; do not infer durable knowledge from chat memory.
5. Before a write, resolve the owning workflow/command/skill gateway and its target namespace. Check for pending transactions, locks, incomplete promotion markers, and recovery evidence.
6. If the gateway or transaction state is unknown, block only the affected memory write and continue independent read-only work. Never create a second memory namespace or bypass the owning workflow.

For promotion, consolidation, or archival, follow the owning workflow's contract and record the selected source IDs, evidence anchors, digest, and post-write reread.
