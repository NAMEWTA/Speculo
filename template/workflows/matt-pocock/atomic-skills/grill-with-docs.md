---
id: grill-with-docs
type: atomic-skill
workflow: matt-pocock
name: Grill With Docs
description: 在代码仓中访谈并同步领域语言与决策。
stability: stable
invocation: user-only
---

# Grill With Docs

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 与 knowledge namespace 已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="engineering/grill-with-docs/SKILL.md" activation="adapted" /><completion>访谈与确认后的知识路径已记录到 skill history。</completion></phase>
</sequence>
```

