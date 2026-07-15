---
id: tdd
type: atomic-skill
workflow: matt-pocock
name: TDD
description: 以红绿重构循环构建一个垂直切片。
stability: stable
invocation: model-allowed
---

# TDD

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change、项目测试与记录边界已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="engineering/tdd/SKILL.md" activation="adapted" /><completion>红绿重构证据已返回，实际记录路径已写入 skill history。</completion></phase>
</sequence>
```

