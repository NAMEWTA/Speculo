---
id: teach
type: atomic-skill
workflow: matt-pocock
name: Teach
description: 在持久化教学工作区中跨会话教授主题。
stability: stable
invocation: user-only
---

# Teach

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 已替代 raw 当前目录作为教学工作区。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="productivity/teach/SKILL.md" activation="adapted" /><completion>教学状态与课程产物路径已记录到 skill history。</completion></phase>
</sequence>
```

