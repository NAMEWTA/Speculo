---
id: matt-pocock
type: workflow
workflow: matt-pocock
name: Matt Pocock Workflow
description: 以路由优先方式组合原生 Matt Pocock skills，并在 Speculo 私有状态根内持久化
keywords: [matt-pocock, engineering, productivity, grilling, tdd, review]
---

# Matt Pocock Workflow

先读取项目根 `speculo/.speculo/workspace.json`，再激活本 workflow。所有状态位于 `state` 根绑定的 `matt-pocock` 子树；所有 route 只按命中分支物理渐进披露。

直接运行 vendor raw skill 不继承本 workflow 的路径上下文和持久化保证。

## 运行时根

```xml
<runtime-context>
  <root id="workflow" base="workflows" path="matt-pocock" />
  <root id="state" base="state" path="matt-pocock" />
  <root id="vendor:matt-pocock" base="vendor" path="matt-pocock" />
</runtime-context>
```

## 持久化命名空间

```xml
<persistence root="state">
  <store id="index" role="index" kind="file" path="status.json" create="initialize" />
  <store id="changes" role="active" kind="directory" path="changes" create="initialize" />
  <store id="archive" role="archive" kind="directory" path="archive" create="initialize" />
  <store id="knowledge" role="knowledge" kind="directory" path="knowledge" create="lazy" consumers="docs-sync,retro,knowledge-prune" />
  <store id="policy" role="policy" kind="directory" path="policy" create="lazy" consumers="docs-sync,knowledge-prune" />
  <store id="integrations" role="integration" kind="directory" path="integrations" create="lazy" />
  <store id="backlog" role="backlog" kind="directory" path="backlog" create="lazy" consumers="retro" />
  <store id="legacy-config" role="legacy-knowledge" kind="directory" path=".config" create="existing-only" legacy="true" consumers="docs-sync,retro,knowledge-prune" />
</persistence>
```

`status.json`、`changes/` 和 `archive/` 是 workflow 固定骨架；其余 store 只在 route 产生对应内容时创建。已有 `.config/` 只作为兼容来源读取，不作为新内容默认写入位置。

## 路由

```xml
<routes>
  <route id="idea-to-delivery" order="1" root="workflow" path="routes/idea-to-delivery.md">
    <when>用户要把想法、需求或明确任务推进为规范、实现和交付。</when>
  </route>
  <route id="wayfinder" order="2" root="workflow" path="routes/wayfinder.md">
    <when>目标庞大且跨多个上下文窗口，通往终点的决策路径仍不可见。</when>
  </route>
  <route id="triage" order="3" root="workflow" path="routes/triage.md">
    <when>需要分类收到的 issue 或外部 PR/MR。</when>
  </route>
  <route id="diagnose" order="4" root="workflow" path="routes/diagnose.md">
    <when>存在疑难 bug、异常、失败或性能回退。</when>
  </route>
  <route id="architecture" order="5" root="workflow" path="routes/architecture.md">
    <when>需要扫描或讨论代码仓深化机会。</when>
  </route>
  <route id="review" order="6" root="workflow" path="routes/review.md">
    <when>需要从固定点审查 diff 或作为实现收尾。</when>
  </route>
  <route id="merge-conflicts" order="7" root="workflow" path="routes/merge-conflicts.md">
    <when>仓库正处于 merge 或 rebase 冲突中。</when>
  </route>
  <route id="research-prototype" order="8" root="workflow" path="routes/research-prototype.md">
    <when>需要一手资料研究或一次性原型回答单个设计问题。</when>
  </route>
  <route id="productivity" order="9" root="workflow" path="routes/productivity.md">
    <when>需要 handoff、教学或 skill 写作指导。</when>
  </route>
  <route id="experimental" order="10" root="workflow" path="routes/experimental.md">
    <when>用户明确要求使用 vendor/in-progress 中的实验能力。</when>
  </route>
</routes>
```

## 进入协议

```xml
<sequence>
  <phase id="select-change" order="1">
    <skill root="skills" path="runtime-context/SKILL.md" activation="required" />
    <artifact root="state" path="status.json" />
    <completion>已选择唯一 active change，或原子创建新 change 与 .status.json。</completion>
  </phase>
  <phase id="route" order="2">
    <skill root="vendor:matt-pocock" path="engineering/ask-matt/SKILL.md" activation="required" />
    <completion>已根据用户意图选择一个 route；歧义时一次只澄清一个决策。</completion>
  </phase>
  <phase id="lazy-config" order="3">
    <instructions root="workflow" path="routes/setup.md" />
    <when>目标 route 依赖尚未配置的 tracker、triage 或 domain 文档。</when>
    <completion>只补齐目标 route 必需的私有 namespace。</completion>
  </phase>
</sequence>
```

## 依赖

```xml
<dependencies>
  <dependency kind="hard" root="vendor:matt-pocock" path="README.md">
    选择本 workflow 时必须安装完整 matt-pocock vendor 目录。
  </dependency>
</dependencies>
```

## 状态扩展字段

```xml
<state-schema>
  <field name="current_route" type="string" />
  <field name="route_history" type="array" />
  <field name="skill_history" type="array" />
  <field name="external_refs" type="array" />
  <field name="legacy_source" type="object|null" />
</state-schema>
```

## 状态转移

```xml
<transitions>
  <transition from="route" to="phase">
    <when>route 已选定且所需 namespace 可用。</when>
  </transition>
  <transition from="phase" to="route">
    <when>当前能力完成并需要进入另一条路线；同一目标继续复用当前 change。</when>
  </transition>
  <transition from="active" to="archived">
    <command root="commands" path="finalize.md" />
    <when>用户确认交付边界且完成门禁通过。</when>
  </transition>
</transitions>
```

## 持久化与副作用

- 所有本地记录先写入当前 change；长期知识、规则、集成配置和 backlog 只写入已声明的 state namespace。
- 原 skill 指向根目录、`.scratch/`、`docs/agents/` 或系统临时目录时，改用当前 change 或声明 namespace 中的等价路径。
- 发布 issue、评论、标签、提交代码、合并或删除 worktree 前必须展示动作并获得明确确认；结果写入 `external_refs`。
- 项目代码、测试和用户要求更新的项目文档不是 Speculo 运行时产物。临时原型必须删除，保留其结论。
