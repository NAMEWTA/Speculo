---
id: matt-pocock
type: workflow
workflow: matt-pocock
name: Matt Pocock Workflow
description: 以路由和原子入口组合 Matt Pocock skills，并共享同一持久化契约
keywords: [matt-pocock, engineering, productivity, grilling, tdd, review]
---

# Matt Pocock Workflow

先读取 [PERSISTENCE.md](./PERSISTENCE.md)。该文件是 runtime roots、store、change 启动和副作用边界的唯一来源；本入口只负责选择组合 route 或单个 atomic skill。

## 进入协议

```xml
<sequence>
  <phase id="load-persistence" order="1">
    <instructions root="workflow" path="PERSISTENCE.md" activation="required" />
    <completion>runtime context 与 current change 已按唯一持久化契约解析。</completion>
  </phase>
  <phase id="route" order="2">
    <instructions root="workflow" path="atomic-skills/ask-matt.md" activation="required" />
    <completion>已根据用户意图选择一个组合 route 或 atomic skill；歧义时一次只澄清一个决策。</completion>
  </phase>
  <phase id="lazy-config" order="3">
    <instructions root="workflow" path="routes/setup.md" />
    <when>目标 route 依赖尚未配置的 tracker、triage 或 domain 文档。</when>
    <completion>只补齐目标 route 必需的私有 namespace。</completion>
  </phase>
</sequence>
```

## 路由

```xml
<routes>
  <route id="idea-to-delivery" order="1" root="workflow" path="routes/idea-to-delivery.md"><when>用户要把想法、需求或明确任务推进为规范、实现和交付。</when></route>
  <route id="wayfinder" order="2" root="workflow" path="routes/wayfinder.md"><when>目标庞大且跨多个上下文窗口，通往终点的决策路径仍不可见。</when></route>
  <route id="triage" order="3" root="workflow" path="routes/triage.md"><when>需要分类收到的 issue 或外部 PR/MR。</when></route>
  <route id="diagnose" order="4" root="workflow" path="routes/diagnose.md"><when>存在疑难 bug、异常、失败或性能回退。</when></route>
  <route id="architecture" order="5" root="workflow" path="routes/architecture.md"><when>需要扫描或讨论代码仓深化机会。</when></route>
  <route id="review" order="6" root="workflow" path="routes/review.md"><when>需要从固定点审查 diff 或作为实现收尾。</when></route>
  <route id="merge-conflicts" order="7" root="workflow" path="routes/merge-conflicts.md"><when>仓库正处于 merge 或 rebase 冲突中。</when></route>
  <route id="research-prototype" order="8" root="workflow" path="routes/research-prototype.md"><when>需要一手资料研究或一次性原型回答单个设计问题。</when></route>
  <route id="productivity" order="9" root="workflow" path="routes/productivity.md"><when>需要 handoff、教学或 skill 写作指导。</when></route>
  <route id="experimental" order="10" root="workflow" path="routes/experimental.md"><when>用户明确要求使用 vendor/in-progress 中的实验能力。</when></route>
</routes>
```

## 原子能力

```xml
<atomic-skills source-root="vendor:matt-pocock" coverage="complete">
  <atomic-skill id="ask-matt" order="1" root="workflow" path="atomic-skills/ask-matt.md"><when>询问应使用哪种 skill 或 route。</when></atomic-skill>
  <atomic-skill id="claude-handoff" order="2" root="workflow" path="atomic-skills/claude-handoff.md"><when>明确要求把会话交给 Claude 后台 agent。</when></atomic-skill>
  <atomic-skill id="code-review" order="3" root="workflow" path="atomic-skills/code-review.md"><when>从固定点进行标准与规范双轴审查。</when></atomic-skill>
  <atomic-skill id="codebase-design" order="4" root="workflow" path="atomic-skills/codebase-design.md"><when>设计深层模块、接口或 seam。</when></atomic-skill>
  <atomic-skill id="diagnosing-bugs" order="5" root="workflow" path="atomic-skills/diagnosing-bugs.md"><when>以反馈循环诊断疑难 bug 或性能回退。</when></atomic-skill>
  <atomic-skill id="domain-modeling" order="6" root="workflow" path="atomic-skills/domain-modeling.md"><when>精炼领域词汇、上下文或 ADR。</when></atomic-skill>
  <atomic-skill id="grill-me" order="7" root="workflow" path="atomic-skills/grill-me.md"><when>用户明确要求对计划或设计进行访谈打磨。</when></atomic-skill>
  <atomic-skill id="grill-with-docs" order="8" root="workflow" path="atomic-skills/grill-with-docs.md"><when>在已有代码仓中访谈并同步领域决策。</when></atomic-skill>
  <atomic-skill id="grilling" order="9" root="workflow" path="atomic-skills/grilling.md"><when>其他能力需要复用逐问访谈循环。</when></atomic-skill>
  <atomic-skill id="handoff" order="10" root="workflow" path="atomic-skills/handoff.md"><when>用户明确要求为另一个会话保存交接上下文。</when></atomic-skill>
  <atomic-skill id="implement" order="11" root="workflow" path="atomic-skills/implement.md"><when>用户明确要求实现既有 spec 或 tickets。</when></atomic-skill>
  <atomic-skill id="improve-codebase-architecture" order="12" root="workflow" path="atomic-skills/improve-codebase-architecture.md"><when>用户明确要求扫描架构深化机会。</when></atomic-skill>
  <atomic-skill id="loop-me" order="13" root="workflow" path="atomic-skills/loop-me.md"><when>用户明确要求实验性的工作流规格访谈。</when></atomic-skill>
  <atomic-skill id="prototype" order="14" root="workflow" path="atomic-skills/prototype.md"><when>用一次性逻辑或 UI 原型回答设计问题。</when></atomic-skill>
  <atomic-skill id="research" order="15" root="workflow" path="atomic-skills/research.md"><when>需要以一手来源调查问题。</when></atomic-skill>
  <atomic-skill id="resolving-merge-conflicts" order="16" root="workflow" path="atomic-skills/resolving-merge-conflicts.md"><when>解决进行中的 merge 或 rebase 冲突。</when></atomic-skill>
  <atomic-skill id="setup-matt-pocock-skills" order="17" root="workflow" path="atomic-skills/setup-matt-pocock-skills.md"><when>用户明确要求配置 tracker、标签或领域布局。</when></atomic-skill>
  <atomic-skill id="tdd" order="18" root="workflow" path="atomic-skills/tdd.md"><when>以红绿重构循环构建一个垂直切片。</when></atomic-skill>
  <atomic-skill id="teach" order="19" root="workflow" path="atomic-skills/teach.md"><when>用户明确要求跨会话学习主题。</when></atomic-skill>
  <atomic-skill id="to-spec" order="20" root="workflow" path="atomic-skills/to-spec.md"><when>用户明确要求把既有讨论综合为 spec。</when></atomic-skill>
  <atomic-skill id="to-tickets" order="21" root="workflow" path="atomic-skills/to-tickets.md"><when>用户明确要求把计划或 spec 拆为 tickets。</when></atomic-skill>
  <atomic-skill id="triage" order="22" root="workflow" path="atomic-skills/triage.md"><when>用户明确要求分类 issue 或外部 PR。</when></atomic-skill>
  <atomic-skill id="wayfinder" order="23" root="workflow" path="atomic-skills/wayfinder.md"><when>用户明确要求为大型模糊目标建立调查地图。</when></atomic-skill>
  <atomic-skill id="wizard" order="24" root="workflow" path="atomic-skills/wizard.md"><when>用户明确要求实验性生成交互式 bash 向导。</when></atomic-skill>
  <atomic-skill id="writing-beats" order="25" root="workflow" path="atomic-skills/writing-beats.md"><when>用户明确要求用节拍路径组装文章。</when></atomic-skill>
  <atomic-skill id="writing-fragments" order="26" root="workflow" path="atomic-skills/writing-fragments.md"><when>用户明确要求访谈并积累写作碎片。</when></atomic-skill>
  <atomic-skill id="writing-great-skills" order="27" root="workflow" path="atomic-skills/writing-great-skills.md"><when>用户明确要求设计或审查 skill。</when></atomic-skill>
  <atomic-skill id="writing-shape" order="28" root="workflow" path="atomic-skills/writing-shape.md"><when>用户明确要求逐段塑造文章结构。</when></atomic-skill>
</atomic-skills>
```

## 依赖与状态转移

```xml
<dependencies>
  <dependency kind="hard" root="vendor:matt-pocock" path="README.md">选择本 workflow 时必须安装完整 matt-pocock vendor 目录。</dependency>
</dependencies>
```

```xml
<transitions>
  <transition from="route" to="phase"><when>route 已选定且所需 namespace 可用。</when></transition>
  <transition from="phase" to="route"><when>当前能力完成并需要进入另一条路线；同一目标继续复用当前 change。</when></transition>
  <transition from="active" to="archived">
    <command root="commands" path="finalize.md" />
    <when>用户确认交付边界且完成门禁通过。</when>
  </transition>
</transitions>
```
