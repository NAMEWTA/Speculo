---
id: research
type: atomic-skill
workflow: matt-pocock
name: Research
description: 以一手来源调查问题并形成带引用结论。
stability: stable
invocation: model-allowed
---

# Research

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 与后台研究确认边界已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="engineering/research/SKILL.md" activation="adapted" /><completion>研究结论与来源已返回，实际文件路径已记录。</completion></phase>
</sequence>
```

