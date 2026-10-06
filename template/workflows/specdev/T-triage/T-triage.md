---
id: specdev/triage
type: workflow-entry
workflow: specdev
name: 请求分诊
description: 需要冻结外部来源、审计摄入、对 completed change 回写来源 Issue、把已完成 Ticket 投影为带分类标签的 GitHub Issue，或把尚未成 Change 的记事项写成仍 open 的 GitHub Issue 时使用；已清晰的本地需求不必为了路由而经本入口。
keywords: [triage, 摄入, import, issue, reconcile, publish, capture, close, 风险, 路由]
---

# 请求分诊

激活后先读 `<Path>{roots.workflows}/specdev/README.md</Path>` 与 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`。Triage 只管理来源冻结和远程投影；已清晰的本地请求直接进入适用 Work，不为路由创建来源工件。

## 选择模式

只读取选中模式的完整协议；协议中的授权、脱敏、去重、模板和失败恢复均为该模式的必需步骤。

| 模式与触发条件 | 必读协议 | 唯一产物/结果 |
|---|---|---|
| **intake**：冻结外部来源或用户要求来源审计 | `<Path>{roots.workflows}/specdev/T-triage/intake-protocol.md</Path>` | change 内 source、triage；分类、风险与下一 Work |
| **reconcile**：已完成 change 要通知并关闭支持的来源 Issue | `<Path>{roots.workflows}/specdev/T-triage/reconcile-protocol.md</Path>` | `external_action` 与远程完成回执 |
| **publish**：已完成 change 的 Ticket 要记入 GitHub | `<Path>{roots.workflows}/specdev/T-triage/publish-protocol.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/publish.md</Path>` 账本；标签 `specdev:published` |
| **capture**：尚未成 Change，只先记录仍 open 的记事项 | `<Path>{roots.workflows}/specdev/T-triage/capture-protocol.md</Path>` | workspace capture 账本；标签 `specdev:captured`；不关闭 Issue |

开发唯一权威始终是本地 source、triage、Spec、Ticket、Map、Goal Plan、Evidence 与状态，GitHub 不是开发 tracker。`external_action` 只拥有来源 Issue，`publish_action` 只拥有票级投影，capture 行 state 只拥有 inbox 记录；三者不互写。

## 定位、执行与写入边界

1. 从已打开的 workspace 解析 roots。intake 可创建或恢复 change；reconcile 与 publish 只选择已存在且满足本地完成门的 change，并读取 `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>`。多个候选真实消歧，不覆盖已冻结来源。
2. capture **既不创建也不选择 change**，不写 `current_work`，不读取 change-completion；只使用可缺省的 `<Path>{roots.state}/specdev/capture.md</Path>`。`mode=capture` 不写入 change 的 triage。
3. 其余三模式读取 `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>`、`<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>` 和状态。`current_work` 为空才登记本 Work；他项占用先恢复或显式 handoff。publish 的轻量来源补建仅按其协议进行，不虚构 locator。
4. 按选中协议执行。远程写入必须有该动作的真实授权，未授权时远程写入为零；通过 `<Path>{roots.skills}/github-npm-ops/SKILL.md</Path>` 操作。失败保留原账本与检查点，不以远程失败改写本地完成事实。

## 验证与返回

intake、reconcile、publish 校验当前 change；capture 只在账本已经存在时校验账本，不为校验创建它：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --stage triage <Path>{roots.state}/specdev/changes/{change}</Path>
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --capture <Path>{roots.state}/specdev/capture.md</Path>
```

回读选中模式的真实源、对应账本、状态和远程回执，报告结果、未完成项、验证命令与完整恢复路径。change 三模式成功才去重更新 `works_run` 并清空 `current_work`；可恢复失败保留当前 Work。capture 不修改任何 change 状态。

intake 返回协议选出的 Work。reconcile 的 `closed | waived | not-applicable`、publish 的 `not-requested | published | waived` 才满足各自归档门；`pending-close | close-failed` 或 `pending | publish-failed` 分别恢复原模式。归档交 `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/A-archive-and-consolidate.md</Path>`，不自动合并两类 Issue。capture 成功返回仍 open 的记录；以后逐条 intake，或由 W 探索，capture 本身不挡归档。
