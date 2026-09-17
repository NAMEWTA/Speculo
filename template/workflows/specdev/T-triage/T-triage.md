---
id: specdev/triage
type: workflow-entry
workflow: specdev
name: 请求分诊
description: 需要冻结外部来源、审计摄入、对 completed change 回写来源 Issue、把已完成 Ticket 投影为带分类标签的 GitHub Issue，或把尚未成 Change 的记事项写成仍 open 的 GitHub Issue 时使用；已清晰的本地需求不必为了路由而经本入口。
keywords: [triage, 摄入, import, issue, reconcile, publish, capture, close, 风险, 路由]
---

# 请求分诊

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/specdev/README.md</Path>`，再执行本入口。

Triage 是 SpecDev 唯一的远程摄入、关闭、发布投影与记事项捕获边界。开发期间，change 级 `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>`、`<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`、`<Path>{roots.state}/specdev/changes/{change}/publish.md</Path>`、Spec、Ticket、Map、Goal Plan、Evidence 和状态文件是开发唯一权威；workspace 级 `<Path>{roots.state}/specdev/capture.md</Path>` 是尚未成 Change 的 inbox 计数权威（缺失合法）。远程系统只保存原始请求、经确认后的完成通知、票级发布记录，以及仍 open 的记事项。GitHub 不是 tracker，也不是开发权威。

## 读取范围

1. 先读取 `<Path>{roots.workflows}/specdev/README.md</Path>` 与当前 Work 的状态入口。
2. 再读取 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`，按当前分支、状态和关键词定位最小相关工件。
3. 只在本 Work 明确要求恢复、冲突、执行安全或归档证据时扩展为全量读取；缺少匹配证据或 owner/gateway 时停止受影响分支。

普通本地请求直接进入适用 Work，不为了完成路由额外创建来源工件。用户明确要求来源审计时仍执行完整 intake；缺陷根因诊断仍交 D，不删除风险分诊与远程回写能力。完成后要记账才选 publish。尚未成 Change、只想先在 GitHub 留一条仍 open 的记录时才选 capture。

## 模式

- **intake**：冻结输入、创建或恢复 change、分类并返回下一 Work。
- **reconcile**：本地 change 已完成后，确认远程完成摘要并关闭支持的 GitHub 来源 Issue；不重新分诊或修改开发契约。
- **publish**：本地 change 已完成后，把计划内 Ticket 投影为带分类标签的 GitHub Issue，用脱敏 Evidence 关闭它们，并留下 `<Path>{roots.state}/specdev/changes/{change}/publish.md</Path>` 账本。标签必须包含 `specdev:published`。
- **capture**：尚未有 Change 时，把记事项写成仍 open 的 GitHub Issue，并留下 `<Path>{roots.state}/specdev/capture.md</Path>`。标签必须包含 `specdev:captured`。不创建 change，不写 change 级 triage 工件，`mode=capture` 不得出现在 `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`。

## 共同启动

1. 解析 roots，按 `<Path>{roots.workflows}/specdev/README.md</Path>` 读取全局状态和 change 状态。
2. Intake 可以创建 change；reconcile 与 publish 必须选择一个已存在的 change。publish 的对象必须已 completed。capture 既不创建也不选择 change，不写 `current_work`，不加载 `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>`。
3. 仅 intake、reconcile 与 publish：若该 change 的 `current_work` 为 null，设置为 `specdev/triage`；指向其他 Work 时先恢复或完成显式 handoff。capture 跳过本步。
4. 重读已有 `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`，不覆盖已冻结的来源。publish 在本地源缺失这些文件时可以按协议补建轻量快照，仍不得虚构 GitHub locator。capture 不读、不写这些文件。

`external_action` 只描述源 Issue。`publish_action` 只描述票级发布投影。capture 行 state 只描述 inbox 记录。三者互不覆盖。未授权时远程写入为零。

## Intake

输入为远程 Issue、URL、项目相对文件、用户粘贴内容或当前对话时，加载 `<Path>{roots.workflows}/specdev/T-triage/intake-protocol.md</Path>`：

1. 按协议解析来源、查重、脱敏、冻结并计算内容 hash；使用 `<Path>{roots.workflows}/specdev/T-triage/source-template.md</Path>` 原子写入 `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>`。
2. 按需读取永久 ADR/CONTEXT、当前 change 工件和相关代码事实；缺失的可选输入静默跳过。相似的已归档拒绝或 ADR 只展示，不自动 wontfix，也不回写源 Issue 标签。
3. 分类为 bug、feature、refactor、investigation、operations、documentation、review 或 mixed。对照见 `<Path>{roots.workflows}/specdev/T-triage/references/classification-map.md</Path>`。
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
- `<Path>{roots.workflows}/specdev/T-triage/reconcile-protocol.md</Path>`；
- `<Path>{roots.workflows}/specdev/T-triage/references/public-projection.md</Path>`。

按协议重验本地完成、生成最小外部摘要、展示准确目标和动作、取得本次明确授权，再调用 `<Path>{roots.skills}/github-npm-ops/SKILL.md</Path>`。成功时把 `external_action` 更新为 `closed`；部分或完全失败为 `close-failed` 并保留可重试检查点；用户明确不关闭时为 `waived`。任何结果都不改写本地完成事实。

Reconcile 成功或 waived 后返回 `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/A-archive-and-consolidate.md</Path>`。不支持关闭的来源使用 `not-applicable`，无需虚构 provider。若用户同时要求 publish，源 Issue 仍不是票 Issue。

## Publish

本地 change 完成、用户指定该 change 并要求把 Ticket 记到 GitHub 时，加载：

- `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>`；
- `<Path>{roots.workflows}/specdev/T-triage/publish-protocol.md</Path>`；
- `<Path>{roots.workflows}/specdev/T-triage/references/classification-map.md</Path>`；
- `<Path>{roots.workflows}/specdev/T-triage/references/public-projection.md</Path>`。

按协议走硬门、确认表、dry-run，再调用 github-npm-ops 的 `issue-search` / `issue-create` / `issue-comment-close`。账本写 `<Path>{roots.state}/specdev/changes/{change}/publish.md</Path>`。Issue 正文用 `<Path>{roots.workflows}/specdev/T-triage/issue-body-template.md</Path>`，关闭评论用 `<Path>{roots.workflows}/specdev/T-triage/close-comment-template.md</Path>`。

成功 `published`、用户放弃 `waived`，或从未请求的 `not-requested` 才允许归档。`pending` 与 `publish-failed` 挡住 Archive。下一站由用户指定：reconcile、A，或停止。

workspace 计数：

```bash
node <Path>{roots.workflows}/specdev/T-triage/tools/publish-status.mjs</Path> \
  --state-root <Path>{roots.state}/specdev</Path>
```

## Capture

尚未成 Change、用户要求先把记事项写到 GitHub 时，加载：

- `<Path>{roots.workflows}/specdev/T-triage/capture-protocol.md</Path>`；
- `<Path>{roots.workflows}/specdev/T-triage/references/classification-map.md</Path>`；
- `<Path>{roots.workflows}/specdev/T-triage/references/public-projection.md</Path>`。

按协议走硬门、确认表、dry-run，再调用 github-npm-ops 的 `issue-search` / `issue-create`。不调用 `issue-comment-close`。账本写 `<Path>{roots.state}/specdev/capture.md</Path>`。Issue 正文用 `<Path>{roots.workflows}/specdev/T-triage/issue-record-template.md</Path>`。默认 1 条记录对应一次未来 intake / 一个未来 Change。攒多了再处理：批量 capture，然后逐条 intake 或先走 W；不把多条 locator 写入同一个 source。

成功留下仍 open 的 inbox Issue。intake 消费到同一 locator 时把对应行标为 `intaken`。用户放弃为 `waived`。capture 不挡 Archive，因为没有 change 可归档。

workspace inbox 计数：

```bash
node <Path>{roots.workflows}/specdev/T-triage/tools/capture-status.mjs</Path> \
  --state-root <Path>{roots.state}/specdev</Path>
```

## 状态与验证

intake、reconcile 或 publish 运行：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --stage triage \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

capture 在账本存在时运行：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --capture <Path>{roots.state}/specdev/capture.md</Path>
```

缺失 `<Path>{roots.state}/specdev/capture.md</Path>` 合法，不要为了校验去创建它。

验证通过后，intake / reconcile / publish 原子重读 source、triage、publish（若请求过）和 change 状态；成功时将 `specdev/triage` 去重加入 `works_run` 并清空 `current_work`；可恢复失败保留 `current_work` 和具体 blocker。capture 不改任何 change 状态。

## 完成标准

- 来源已冻结为本地工件，原意未被改写，敏感值未持久化；
- 相同 locator 不会静默创建重复 change或覆盖已有快照；
- 分类、影响、风险、未知项和下一 Work 有证据；
- 开发权威完全位于本地 state；
- 未授权时远程写入为零；
- Reconcile 可从失败检查点幂等恢复；
- Publish 可从 `<Path>{roots.state}/specdev/changes/{change}/publish.md</Path>` 失败行幂等恢复，cancelled 默认 skip，本地源计入发布数；
- Capture 可从 `<Path>{roots.state}/specdev/capture.md</Path>` 失败行幂等恢复，Issue 保持 open，不创建 Change；
- 状态、验证结果和下一 Work 完整路径已返回。

## 子文件引用

- Intake：`<Path>{roots.workflows}/specdev/T-triage/intake-protocol.md</Path>`
- Reconcile：`<Path>{roots.workflows}/specdev/T-triage/reconcile-protocol.md</Path>`
- Publish：`<Path>{roots.workflows}/specdev/T-triage/publish-protocol.md</Path>`
- Capture：`<Path>{roots.workflows}/specdev/T-triage/capture-protocol.md</Path>`
- Source 模板：`<Path>{roots.workflows}/specdev/T-triage/source-template.md</Path>`
- Triage 模板：`<Path>{roots.workflows}/specdev/T-triage/triage-template.md</Path>`
- Publish 模板：`<Path>{roots.workflows}/specdev/T-triage/publish-template.md</Path>`
- Capture 模板：`<Path>{roots.workflows}/specdev/T-triage/capture-template.md</Path>`
- 分类映射：`<Path>{roots.workflows}/specdev/T-triage/references/classification-map.md</Path>`
- 公共投影：`<Path>{roots.workflows}/specdev/T-triage/references/public-projection.md</Path>`
- Issue 正文：`<Path>{roots.workflows}/specdev/T-triage/issue-body-template.md</Path>`
- 记事项正文：`<Path>{roots.workflows}/specdev/T-triage/issue-record-template.md</Path>`
- 关闭评论：`<Path>{roots.workflows}/specdev/T-triage/close-comment-template.md</Path>`
- 发布计数：`<Path>{roots.workflows}/specdev/T-triage/tools/publish-status.mjs</Path>`
- inbox 计数：`<Path>{roots.workflows}/specdev/T-triage/tools/capture-status.mjs</Path>`
