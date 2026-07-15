---
id: grill-me
type: atomic-skill
workflow: matt-pocock
name: Grill Me
description: 通过逐问访谈打磨计划或设计。
stability: stable
invocation: user-only
---

# Grill Me

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 与访谈记录边界已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="productivity/grill-me/SKILL.md" activation="adapted" /><completion>访谈已收敛或明确 blocked，记录路径已写入 skill history。</completion></phase>
</sequence>
```

