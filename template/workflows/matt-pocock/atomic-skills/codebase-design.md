---
id: codebase-design
type: atomic-skill
workflow: matt-pocock
name: Codebase Design
description: 使用深层模块词汇设计接口与 seam。
stability: stable
invocation: model-allowed
---

# Codebase Design

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 与知识边界已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="engineering/codebase-design/SKILL.md" activation="adapted" /><completion>设计结论已返回，实际产物路径已记录到 skill history。</completion></phase>
</sequence>
```

