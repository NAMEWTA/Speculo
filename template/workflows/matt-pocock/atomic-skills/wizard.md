---
id: wizard
type: atomic-skill
workflow: matt-pocock
name: Wizard
description: 生成用于人工设置或迁移的交互式 bash 向导。
stability: experimental
invocation: user-only
---

# Wizard

本能力不稳定，仅在用户明确要求时启用。直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change、secret 与外部动作确认边界已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="in-progress/wizard/SKILL.md" activation="adapted" /><completion>脚本已静态验证；临时/项目归属与外部写入结果已记录。</completion></phase>
</sequence>
```

