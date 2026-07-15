---
id: claude-handoff
type: atomic-skill
workflow: matt-pocock
name: Claude Handoff
description: 将当前对话交给新的 Claude 后台 agent。
stability: experimental
invocation: user-only
---

# Claude Handoff

本能力不稳定，仅在用户明确要求时启用。直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 与后台 agent 确认边界已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="in-progress/claude-handoff/SKILL.md" activation="adapted" /><completion>目标 skill 已执行；启动结果已脱敏并记录到 skill history/external refs。</completion></phase>
</sequence>
```

