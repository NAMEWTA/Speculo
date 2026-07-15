---
id: grilling
type: atomic-skill
workflow: matt-pocock
name: Grilling
description: 复用逐问访谈循环直至关键分支清晰。
stability: stable
invocation: model-allowed
---

# Grilling

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 与访谈记录边界已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="productivity/grilling/SKILL.md" activation="adapted" /><completion>访谈决策已返回，记录路径已写入 skill history。</completion></phase>
</sequence>
```

