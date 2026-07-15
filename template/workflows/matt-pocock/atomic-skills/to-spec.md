---
id: to-spec
type: atomic-skill
workflow: matt-pocock
name: To Spec
description: 将既有讨论综合为可交付 spec。
stability: stable
invocation: user-only
---

# To Spec

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 与 tracker 外发确认边界已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="engineering/to-spec/SKILL.md" activation="adapted" /><completion>spec 先在 change 中形成；外发结果与路径已记录。</completion></phase>
</sequence>
```

