---
id: person/mao-zedong-cognitive-os
type: workflow-entry
workflow: person
name: 毛泽东认知操作系统
description: 以毛泽东方法论为底座的问题诊断、战略制定与行动规划咨询
keywords: [毛泽东, 毛选, 矛盾分析, 战略, 组织, 咨询]
---

# 毛泽东 · 认知操作系统

本入口把“分析问题—制定战略—组织行动”组织为渐进披露的咨询流程。产物写入当前 `person/changes/<change>/`。

## 阶段

```xml
<sequence>
  <phase id="activate" order="1">
    <instructions root="workflow" path="M-mao-zedong-cognitive-os/activate.md" />
    <artifact root="change" path="problem-statement.md" />
    <completion>首次激活声明已执行，问题陈述无 TODO。</completion>
  </phase>
  <phase id="diagnose" order="2">
    <instructions root="workflow" path="M-mao-zedong-cognitive-os/diagnose.md" />
    <artifact root="change" path="analysis.md" />
    <completion>至少两个诊断模型已应用，分析无 TODO。</completion>
  </phase>
  <phase id="strategize" order="3">
    <instructions root="workflow" path="M-mao-zedong-cognitive-os/strategize.md" />
    <artifact root="change" path="strategy.md" />
    <completion>主要矛盾和战略框架已确认。</completion>
  </phase>
  <phase id="mobilize" order="4">
    <instructions root="workflow" path="M-mao-zedong-cognitive-os/mobilize.md" />
    <artifact root="change" path="action-plan.md" />
    <completion>行动、责任与反馈机制已明确。</completion>
  </phase>
  <phase id="deliver" order="5">
    <instructions root="workflow" path="M-mao-zedong-cognitive-os/deliver.md" />
    <template root="workflow" path="_templates/mao-consultation-output-template.md" />
    <artifact root="change" path="consultation-output.md" />
    <completion>综合输出无 TODO，并经用户确认。</completion>
  </phase>
</sequence>
```

## 依赖

```xml
<dependencies>
  <dependency kind="hard" from="diagnose" to="activate" />
  <dependency kind="hard" from="strategize" to="diagnose" />
  <dependency kind="hard" from="mobilize" to="strategize" />
  <dependency kind="hard" from="deliver" to="mobilize" />
</dependencies>
```

## 状态扩展字段

```xml
<state-schema>
  <field name="problem_type" type="string" />
  <field name="primary_framework" type="string" />
  <field name="models_applied" type="array" />
  <field name="frameworks_applied" type="array" />
  <field name="methods_applied" type="array" />
  <field name="quotes_cited" type="array" />
  <field name="consultation_status" type="activating|diagnosing|strategizing|mobilizing|delivering|completed" />
</state-schema>
```

## 状态转移

```xml
<transitions>
  <transition from="activate" to="diagnose" />
  <transition from="diagnose" to="strategize" />
  <transition from="strategize" to="mobilize" />
  <transition from="mobilize" to="deliver" />
  <transition from="deliver" to="finalize">
    <command root="commands" path="finalize.md" />
    <when>用户确认综合咨询输出。</when>
  </transition>
</transitions>
```

## 渐进披露

角色、声音、模型和引用规则继续由各 phase 文件及其相对引用拥有；未进入 phase 时不加载对应材料。
