---
id: writing-fragments
type: atomic-skill
workflow: matt-pocock
name: Writing Fragments
description: 通过访谈探索并追加写作碎片。
stability: experimental
invocation: user-only
---

# Writing Fragments

本能力不稳定，仅在用户明确要求时启用。直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 或用户明确项目目标已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="in-progress/writing-fragments/SKILL.md" activation="adapted" /><completion>碎片文档路径已记录，用户编辑得到保留。</completion></phase>
</sequence>
```

