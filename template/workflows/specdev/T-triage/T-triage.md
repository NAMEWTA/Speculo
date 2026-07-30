---
id: specdev/triage
type: workflow-entry
workflow: specdev
name: 请求分诊
description: 完整摄入外部请求，判断问题类型、影响、风险、缺失信息和下一 work，不在分诊阶段过早设计或实现。
keywords: [triage, 摄入, issue, 风险, 路由]
---

# 请求分诊

分诊负责保存原始意图、建立 change、识别问题类型与风险，并推荐下一 work。分诊完成不等于实现 Ready。

## 流程

1. **创建或选择 change**：使用 `<Path>{roots.state}/specdev/changes/{change}/</Path>`。
2. **摄入原文**：完整保存到 `<Path>{roots.state}/specdev/changes/{change}/source-issue.md</Path>`，保留来源、时间、链接和附件引用，不改写原意。
3. **读取上下文**：按需读取 `<Path>{roots.state}/specdev/context/</Path>`、`<Path>{roots.state}/specdev/adr/</Path>`、当前 change 文档和相关代码事实。
4. **分类**：bug、feature、refactor、investigation、operations、documentation 或混合；混合请求按主要阻塞问题路由，不强行塞入单类。
5. **评估**：影响、紧急度、风险、事故半径、安全/数据/兼容/迁移因素和所需人工批准。
6. **未知项分类**：可发现事实继续探索；无法发现且会改变方案的内容标为 decision-needed；低影响实现细节不阻塞。
7. **推荐路线**：
   - bug 且根因未知 → `<Path>{roots.workflows}/specdev/D-diagnose-bugs/D-diagnose-bugs.md</Path>`；
   - 需求或架构不清 → `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>`；
   - 外部行为已清楚 → `<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>`；
   - 小且完全明确、风险低 → `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>` 的 Lite Ticket，或用户批准的 Direct Spec 实现；
   - 路径未知或调查超出单次上下文 → `<Path>{roots.workflows}/specdev/W-wayfinder/W-wayfinder.md</Path>`；
   - 架构质量问题 → `<Path>{roots.workflows}/specdev/R-review-architecture/R-review-architecture.md</Path>`。
8. **写入结果**：使用 `<Path>{roots.workflows}/specdev/T-triage/triage-template.md</Path>` 写入 `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`，更新 `<Path>{roots.state}/specdev/status.json</Path>` 和 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`（首次创建时使用 `<Path>{roots.workflows}/specdev/I-init-setup/change-status-template.json</Path>`）。

## 就绪门禁

只有推荐为“直接实现”，且目标、范围、验证、路径和风险均明确并获用户批准时，才能设置 `ready_for_implementation: true`。其他情况必须为 `false`，并明确下一 work。

## 完成标准

- 原始请求未被改写或丢失；
- 问题类型、影响、风险和未知项已区分；
- 推荐下一 work 有明确理由；
- 分诊没有夹带实现；
- 状态已更新。

## 子文件引用

- 分诊模板：`<Path>{roots.workflows}/specdev/T-triage/triage-template.md</Path>`
