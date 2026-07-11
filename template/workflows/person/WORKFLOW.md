---
id: person
type: workflow
workflow: person
name: Person Workflow
description: 以人物方法论为底座的显式激活型咨询 workflow
keywords: [person, methodology, consulting, 人物, 方法论]
---

# Person Workflow

先读取项目根 `speculo/.speculo/workspace.json`，再解析以下 workflow/state 根。进入时读取 `status.json`，选择唯一 active change；没有 active change 时原子创建 `changes/<YYYY-MM-DD-name>/.status.json` 并追加索引。

## 运行时根

```xml
<runtime-context>
  <root id="workflow" base="workflows" path="person" />
  <root id="state" base="state" path="person" />
</runtime-context>
```

## 持久化命名空间

```xml
<persistence root="state">
  <store id="index" role="index" kind="file" path="status.json" create="initialize" />
  <store id="changes" role="active" kind="directory" path="changes" create="initialize" />
  <store id="archive" role="archive" kind="directory" path="archive" create="initialize" />
  <store id="knowledge" role="knowledge" kind="directory" path=".config" create="initialize" consumers="docs-sync,retro,knowledge-prune" />
</persistence>
```

## 路由

```xml
<routes>
  <route id="mao-zedong-cognitive-os" order="1" root="workflow" path="M-mao-zedong-cognitive-os/M-mao-zedong-cognitive-os.md">
    <when>用户希望以毛泽东方法论分析问题、制定战略或组织行动。</when>
  </route>
</routes>
```

## 依赖

```xml
<dependencies />
```

## 状态扩展字段

```xml
<state-schema>
  <field name="current_route" type="string" />
  <field name="route_history" type="array" />
</state-schema>
```

## 状态转移

```xml
<transitions>
  <transition from="active" to="archived">
    <command root="commands" path="finalize.md" />
    <when>用户确认咨询交付完成且完成门禁通过。</when>
  </transition>
</transitions>
```
