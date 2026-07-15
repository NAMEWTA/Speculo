---
id: handoff
type: atomic-skill
workflow: matt-pocock
name: Handoff
description: 为另一个 agent 或会话保存脱敏交接文档。
stability: stable
invocation: user-only
---

# Handoff

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 已替代 raw 临时目录作为持久化边界。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="productivity/handoff/SKILL.md" activation="adapted" /><completion>脱敏交接文档路径已记录到 skill history。</completion></phase>
</sequence>
```

