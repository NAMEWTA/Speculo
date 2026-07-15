---
id: prototype
type: atomic-skill
workflow: matt-pocock
name: Prototype
description: 用一次性逻辑或 UI 原型回答单个设计问题。
stability: stable
invocation: model-allowed
---

# Prototype

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change、项目原型与清理边界已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="engineering/prototype/SKILL.md" activation="adapted" /><completion>原型结论已保留，临时代码已删除或吸收，路径已记录。</completion></phase>
</sequence>
```

