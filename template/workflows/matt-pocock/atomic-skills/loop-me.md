---
id: loop-me
type: atomic-skill
workflow: matt-pocock
name: Loop Me
description: 通过有状态访谈形成可实施的工作流规格。
stability: experimental
invocation: user-only
---

# Loop Me

本能力不稳定，仅在用户明确要求时启用。直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 已作为实验工作区。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="in-progress/loop-me/SKILL.md" activation="adapted" /><completion>工作流规格路径已记录到 skill history。</completion></phase>
</sequence>
```

