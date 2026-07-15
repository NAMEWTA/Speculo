---
id: wayfinder
type: atomic-skill
workflow: matt-pocock
name: Wayfinder
description: 为大型模糊目标建立并遍历调查地图。
stability: stable
invocation: user-only
---

# Wayfinder

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 与 tracker 外部动作边界已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="engineering/wayfinder/SKILL.md" activation="adapted" /><completion>地图与前沿先本地记录；确认后的 tracker 结果已写回。</completion></phase>
</sequence>
```

