---
id: setup-matt-pocock-skills
type: atomic-skill
workflow: matt-pocock
name: Setup Matt Pocock Skills
description: 配置 tracker、triage 标签和领域知识布局。
stability: stable
invocation: user-only
---

# Setup Matt Pocock Skills

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change、integrations 与 knowledge namespaces 已解析。</completion></phase>
  <phase id="invoke" order="2"><skill root="vendor:matt-pocock" path="engineering/setup-matt-pocock-skills/SKILL.md" activation="adapted" /><completion>确认后的配置写入声明 namespace，实际路径已记录。</completion></phase>
</sequence>
```

