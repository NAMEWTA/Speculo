---
id: implement
type: atomic-skill
workflow: matt-pocock
name: Implement
description: 基于既有 spec 或 tickets 实现并验证工作。
stability: stable
invocation: user-only
---

# Implement

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change、项目产物与确认边界已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="engineering/implement/SKILL.md" activation="adapted" /><completion>实现与验证结果已返回；项目变更和运行记录各自位于正确边界。</completion></phase>
</sequence>
```

