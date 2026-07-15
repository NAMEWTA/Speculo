---
id: ask-matt
type: atomic-skill
workflow: matt-pocock
name: Ask Matt
description: 为当前情况选择合适的 Matt Pocock skill 或 route。
stability: stable
invocation: user-only
---

# Ask Matt

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 与写入边界已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="engineering/ask-matt/SKILL.md" activation="adapted" /><completion>目标 skill 已执行并记录 skill history；后续 skill 名称继续解析到本目录 wrapper。</completion></phase>
</sequence>
```

