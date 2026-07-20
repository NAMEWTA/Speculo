---
id: to-tickets
type: atomic-skill
workflow: matt-pocock
name: To Tickets
description: 将计划或 spec 拆分为带阻塞边的 tickets。
stability: stable
invocation: user-only
---

# To Tickets

直接调用前必须读取 [PERSISTENCE.md](../PERSISTENCE.md)。

```xml
<sequence>
  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /><completion>current change 与 tracker 外发确认边界已解析。</completion></phase>
  <phase id="adapt-local-template" order="2"><instructions><p>vendor SKILL.md Step 5 本地文件模式覆盖：忽略 vendor 的"写入单个 <code>tickets.md</code>"指令，改为以下目录结构：</p>
<pre><code>tickets/
├── README.md
├── 01-&lt;kebab-title&gt;.md
├── 02-&lt;kebab-title&gt;.md
└── ...</code></pre>
<p><strong>README.md</strong> — 索引表：| # | Ticket | 被阻塞于 | 状态 |（状态：待开始/进行中/已完成）。<br/>
<strong>NN-&lt;kebab-title&gt;.md</strong> — 每个 ticket 一个文件，头部 <code># Ticket NN：&lt;标题&gt;</code>，包含"被阻塞于"字段用编号+标题引用阻塞 ticket。</p>
<p><strong>真实 issue tracker 模式不变。</strong></p></instructions><completion>本地文件模板已适配为 per-ticket 目录结构。</completion></phase>
  <phase id="invoke" order="3"><skill root="vendor:matt-pocock" path="engineering/to-tickets/SKILL.md" activation="adapted" /><completion>tickets 先在 change 中形成（tickets/ 目录，含 README.md 与 per-ticket 文件）；外发结果与路径已记录。</completion></phase>
</sequence>
```

