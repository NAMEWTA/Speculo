---
id: writing-great-skills
type: atomic-skill
workflow: matt-pocock
name: Writing Great Skills
description: 使用可预测性模型设计或审查 skill。
stability: stable
invocation: user-only
---

# Writing Great Skills

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 与项目 skill 产物边界已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="productivity/writing-great-skills/SKILL.md" activation="adapted" /><completion>skill 审计结论与实际修改/报告路径已记录。</completion></phase>
</sequence>
```

