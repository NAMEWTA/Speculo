---
id: specdev/triage
type: workflow-entry
workflow: specdev
name: 请求分诊
description: 把远程 Issue、URL、文件或对话冻结为本地来源工件，完成风险分诊与路由，并在本地 change 完成后受控回写和关闭支持的远程 Issue。
keywords: [triage, 摄入, import, issue, reconcile, close, 风险, 路由]
---

# 请求分诊

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/specdev/README.md</Path>`，再执行本入口。

Triage 是 SpecDev 唯一的远程摄入与关闭边界。开发期间，`<Path>{roots.state}/specdev/changes/{change}/source.md</Path>`、`<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`、Spec、Ticket、Map、Goal Plan、Evidence 和状态文件是唯一权威；远程系统只保存原始请求以及经确认后的完成通知。

## 模式

- **intake**：冻结输入、创建或恢复 change、分类并返回下一 Work。
- **reconcile**：本地 change 已完成后，确认远程完成摘要并关闭支持的 GitHub Issue；不重新分诊或修改开发契约。

## 共同启动

1. 解析 roots，按 `<Path>{roots.workflows}/specdev/README.md</Path>` 读取全局状态和 change 状态。
2. Intake 可以创建 change；reconcile 必须选择一个已存在的 completed change。
3. 若该 change 的 `current_work` 为 null，设置为 `specdev/triage`；指向其他 Work 时先恢复或完成显式 handoff。
4. 重读已有 `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`，不覆盖已冻结的来源。

## Intake

输入为远程 Issue、URL、项目相对文件、用户粘贴内容或当前对话时，加载 `<Path>{roots.workflows}/specdev/T-triage/intake-protocol.md</Path>`：

1. 按协议解析来源、查重、脱敏、冻结并计算内容 hash；使用 `<Path>{roots.workflows}/specdev/T-triage/source-template.md</Path>` 原子写入 `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>`。
2. 按需读取永久 ADR/CONTEXT、当前 change 工件和相关代码事实；缺失的可选输入静默跳过。
3. 分类为 bug、feature、refactor、investigation、operations、documentation、review 或 mixed。
4. 评估影响、紧急度、事故半径、安全、数据、迁移和人工批准；把未知项分为可发现事实、decision-needed 和低影响实现细节。
5. 使用 `<Path>{roots.workflows}/specdev/T-triage/triage-template.md</Path>` 写入 `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`。
6. 运行阶段校验并返回最小正确路线：
   - 根因未知的 bug → `<Path>{roots.workflows}/specdev/D-diagnose-bugs/D-diagnose-bugs.md</Path>`；
   - 产品或架构决定未锁定 → `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>`；
   - 路径超出单次上下文 → `<Path>{roots.workflows}/specdev/W-wayfinder/W-wayfinder.md</Path>`；
   - 需要检测项目 UI、比较风格候选并固化可运行设计包 → `<Path>{roots.workflows}/specdev/P-prototype/P-prototype.md</Path>`；
   - 外部行为明确 → `<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>`；
   - 固定点 diff 或 PR 审查 → `<Path>{roots.workflows}/specdev/C-code-review/C-code-review.md</Path>`；
   - 小型明确变更 → `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>` 或获批 Direct Spec。

只有目标、范围、验证、路径和风险全部明确且用户批准 Direct Spec 时，`ready_for_implementation` 才能为 true。

## Reconcile

本地 change 完成并需要关闭来源 Issue 时，加载：

- `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>`；
- `<Path>{roots.workflows}/specdev/T-triage/reconcile-protocol.md</Path>`。

按协议重验本地完成、生成最小外部摘要、展示准确目标和动作、取得本次明确授权，再调用 `<Path>{roots.skills}/github-npm-ops/SKILL.md</Path>`。成功时把 `external_action` 更新为 `closed`；部分或完全失败为 `close-failed` 并保留可重试检查点；用户明确不关闭时为 `waived`。任何结果都不改写本地完成事实。

Reconcile 成功或 waived 后返回 `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/A-archive-and-consolidate.md</Path>`。不支持关闭的来源使用 `not-applicable`，无需虚构 provider。

## 状态与验证

运行：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --stage triage \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

验证通过后原子重读 source、triage 和 change 状态。Intake 或 reconcile 成功时将 `specdev/triage` 去重加入 `works_run` 并清空 `current_work`；可恢复失败保留 `current_work` 和具体 blocker。

## 完成标准

- 来源已冻结为本地工件，原意未被改写，敏感值未持久化；
- 相同 locator 不会静默创建重复 change或覆盖已有快照；
- 分类、影响、风险、未知项和下一 Work 有证据；
- 开发权威完全位于本地 state；
- 未授权时远程写入为零；
- Reconcile 可从失败检查点幂等恢复；
- 状态、验证结果和下一 Work 完整路径已返回。

## 子文件引用

- Intake：`<Path>{roots.workflows}/specdev/T-triage/intake-protocol.md</Path>`
- Reconcile：`<Path>{roots.workflows}/specdev/T-triage/reconcile-protocol.md</Path>`
- Source 模板：`<Path>{roots.workflows}/specdev/T-triage/source-template.md</Path>`
- Triage 模板：`<Path>{roots.workflows}/specdev/T-triage/triage-template.md</Path>`
