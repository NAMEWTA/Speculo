---
id: domain-modeling
type: atomic-skill
workflow: matt-pocock
name: Domain Modeling
description: 精炼领域词汇、上下文和架构决策。
stability: stable
invocation: model-allowed
---

# Domain Modeling

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 与 knowledge namespace 已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="engineering/domain-modeling/SKILL.md" activation="adapted" /><completion>术语与决策先在 change 中形成，确认后的长期路径已记录。</completion></phase>
</sequence>
```

