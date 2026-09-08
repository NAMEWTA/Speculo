# Memory retrieval and write gateway

Use this protocol whenever a workflow, command, skill, or work needs durable knowledge or memory.

1. Identify the request topic, scope, stable ID, and the evidence type needed.
2. Search the relevant index/catalog rows by ID, topic, scope or provenance; retrieve a bounded matching span before reading original entries. A required compact authoritative status projection may be read in full.
3. Read only the selected entry and the minimum source/provenance anchors needed to answer or validate the request. Do not read an entire index, archive, or knowledge tree by default.
4. If no entry matches, report the missing evidence and stop the dependent decision; do not infer durable knowledge from chat memory.
5. Before a write, resolve the owning workflow/command/skill gateway and its target namespace. Check for pending transactions, locks, incomplete promotion markers, and recovery evidence.
6. If the gateway or transaction state is unknown, block only the affected memory write and continue independent work within its existing authorization. Never create a second memory namespace or bypass the owning workflow.

For promotion, consolidation, or archival, follow the owning workflow's contract and record the selected source IDs, evidence anchors, digest, and post-write reread.

An unfinished transaction belonging to another task is not abandoned merely because it is old. Do not take over, unlock, clear or overwrite it. Block only overlapping resources and their dependency closure; unrelated work may continue. Resume an owned transaction only through its original gateway.
