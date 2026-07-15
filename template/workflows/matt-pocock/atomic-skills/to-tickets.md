---
id: to-tickets
type: atomic-skill
workflow: matt-pocock
name: To Tickets
description: 将计划或 spec 拆分为带阻塞边的 tickets。
stability: stable
invocation: user-only
---

# To Tickets

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 与 tracker 外发确认边界已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="engineering/to-tickets/SKILL.md" activation="adapted" /><completion>tickets 先在 change 中形成；外发结果与路径已记录。</completion></phase>
</sequence>
```

