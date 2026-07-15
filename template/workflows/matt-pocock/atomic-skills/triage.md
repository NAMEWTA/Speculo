---
id: triage
type: atomic-skill
workflow: matt-pocock
name: Triage
description: 将 issues 或外部 PR 移过 triage 状态机。
stability: stable
invocation: user-only
---

# Triage

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change、policy 与外部动作确认边界已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="engineering/triage/SKILL.md" activation="adapted" /><completion>建议先本地记录；确认后的外部结果与路径已写回。</completion></phase>
</sequence>
```

