---
id: resolving-merge-conflicts
type: atomic-skill
workflow: matt-pocock
name: Resolving Merge Conflicts
description: 查明双方意图并解决进行中的 merge 或 rebase 冲突。
stability: stable
invocation: model-allowed
---

# Resolving Merge Conflicts

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 与继续 merge/rebase 的确认边界已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="engineering/resolving-merge-conflicts/SKILL.md" activation="adapted" /><completion>冲突结果与验证证据已记录；继续或提交仅在确认后执行。</completion></phase>
</sequence>
```

