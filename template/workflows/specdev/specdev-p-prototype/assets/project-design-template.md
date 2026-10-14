---
schema_version: 1
artifact: project-design
revision: DESIGN-0001
owner: specdev/archive-and-consolidate
scope: [<app-or-surface-scope>]
tokens:
  <semantic-token>: <established-value>
rules:
  - id: DS-001
    statement: <approved-reusable-rule>
    scope: [<app-or-surface-scope>]
    verification: approved-intent
    sources: []
sources:
  - id: <source-id>
    locator: <verified-project-or-reference-locator>
supersedes: null
updated_at: <ISO-8601>
---

# Project Design: <项目名称>

本模板由 P 在当前原型包的 baseline-draft 准备候选，只有 A 网关可发布到 <Path>{roots.state}/specdev/design/DESIGN.md</Path>。初始化不得创建此内容。替换全部占位符；以 <Path>{roots.workflows}/specdev/common/schemas/project-design.schema.json</Path> 校验。初始规则为 approved-intent；归档提升为 implemented 必须附真实 change、locator 与 digest。

## Overview

目标受众、适用 app/页面、设计目标、已承诺品牌、信息密度与模板组合依据。产品事实引用既有 CONTEXT；架构选择引用 ADR，不复制其权威。

## Colors

解释 frontmatter 语义 token 的用途、主题和对比策略，不另写冲突数值。

## Typography

字体角色、中文与数字、正文可读性、层级及允许的本地字体资产；沿用项目事实。

## Layout

网格、间距/密度、布局和跨端重排原则；不固化某次 change 的页面文案或单次内容。

## Elevation & Depth

表面、边框、阴影与浮层层级的职责。

## Shapes

形状、圆角和图标一致性，注明适用边界。

## Components

共享组件的用途、状态、键盘/focus、触屏、异步反馈、失败恢复与 reduced motion。规则使用稳定 ID；每项可追溯批准或实现来源。

## Do's and Don'ts

用户和项目确认的具体约束；外部设计反模式是辅助诊断，不自动变成项目绝对禁令。

## Provenance and Supersession

记录实际读取的来源、版本、许可、确认 locator，以及替代的规则和原因。未验证建议与已实现规则分开；一次初始批准可发布意图，不声称生产已经采用。
