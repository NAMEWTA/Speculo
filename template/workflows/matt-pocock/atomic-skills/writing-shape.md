---
id: writing-shape
type: atomic-skill
workflow: matt-pocock
name: Writing Shape
description: 将素材堆逐段塑造成独立文章。
stability: experimental
invocation: user-only
---

# Writing Shape

本能力不稳定，仅在用户明确要求时启用。直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 或用户明确项目目标已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="in-progress/writing-shape/SKILL.md" activation="adapted" /><completion>文章路径已记录，素材与用户编辑得到保留。</completion></phase>
</sequence>
```
