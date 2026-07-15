---
id: improve-codebase-architecture
type: atomic-skill
workflow: matt-pocock
name: Improve Codebase Architecture
description: 扫描代码仓并呈现架构深化机会。
stability: stable
invocation: user-only
---

# Improve Codebase Architecture

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 已替代 raw 系统临时目录作为报告边界。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="engineering/improve-codebase-architecture/SKILL.md" activation="adapted" /><completion>报告与选择结果已返回，实际路径已记录到 skill history。</completion></phase>
</sequence>
```

