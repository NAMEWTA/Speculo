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
  <phase id="adapt-paths" order="2"><instructions><p>vendor SKILL.md 写入以下通用路径前，先按 Persistence Rule 4 映射到持久化命名空间：</p><ul><li>vendor 指示写入 <code>docs/agents/issue-tracker.md</code> → 实际写入 <code>{state_root}/integrations/issue-tracker.md</code></li><li>vendor 指示写入 <code>docs/agents/triage-labels.md</code> → 实际写入 <code>{state_root}/integrations/triage-labels.md</code></li><li>vendor 指示写入 <code>docs/agents/domain.md</code> → 实际写入 <code>{state_root}/knowledge/domain.md</code></li><li>vendor 指示编辑 <code>CLAUDE.md</code> / <code>AGENTS.md</code> → 保持原路径不变（项目根文件，不在 Rule 4 映射范围）</li></ul><p>vendor 引用 <code>docs/agents/*.md</code> 作为读取路径时也反向映射。若项目中已存在旧版 <code>docs/agents/</code> 残留文件，先告知用户并提供迁移选项。</p></instructions><completion>路径映射表已建立。</completion></phase>
  <phase id="invoke" order="3"><skill root="vendor:matt-pocock" path="engineering/setup-matt-pocock-skills/SKILL.md" activation="adapted" /><completion>确认后的配置写入声明 namespace，实际路径已记录。</completion></phase>
</sequence>
```

