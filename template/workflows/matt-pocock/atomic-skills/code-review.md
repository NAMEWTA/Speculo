---
id: code-review
type: atomic-skill
workflow: matt-pocock
name: Code Review
description: 从固定点执行标准与规范双轴代码审查。
stability: stable
invocation: model-allowed
---

# Code Review

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 与写入边界已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="engineering/code-review/SKILL.md" activation="adapted" /><completion>双轴结果已返回，实际报告路径已记录到 skill history。</completion></phase>
</sequence>
```

