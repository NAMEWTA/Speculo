---
id: diagnosing-bugs
type: atomic-skill
workflow: matt-pocock
name: Diagnosing Bugs
description: 用紧凑反馈循环诊断疑难 bug 或性能回退。
stability: stable
invocation: model-allowed
---

# Diagnosing Bugs

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 与诊断产物边界已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="engineering/diagnosing-bugs/SKILL.md" activation="adapted" /><completion>诊断结果与回归证据已返回，路径已记录到 skill history。</completion></phase>
</sequence>
```

