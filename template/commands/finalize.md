---
id: finalize
type: command
name: Finalize
description: 对任意 workflow change 执行完成门禁、状态收尾与安全归档，也可批量归档已完成 change
keywords: [finalize, verify, complete, archive, 收尾]
---

# Finalize 命令

## 报告

统一写入：`speculo/.speculo/commands/finalize/<YYYY-MM-DD>-<scope>-<topic>[-NN].md`。

报告必须记录 `mode`、选中的 workflow/change、验证证据、状态变化、源路径、目标路径、用户确认和最终结果。

## 模式

### finalize-active

1. 读取 `../skills/runtime-context/SKILL.md` 和 `../skills/change-lifecycle/SKILL.md`，解析 `speculo/config.json`（不存在时以默认值静默降级）和 workflow 的固定 `changes/archive` 根。
2. 选择一个 active change，执行新鲜验证、需求核对和 worktree 预检；缺证据即 blocked。
3. 展示验证证据、状态变化、归档目标和报告路径，等待用户明确确认。
4. 确认后将 change 置为 completed，再移动到 archive，更新 `status.json#active`，复查目标和索引。

### archive-completed

1. 选择 workflow 或 `multi-workflow` 范围，扫描所有 completed change；不重新验证，也不接受 active/broken change。
2. 读取 `change-lifecycle` 的归档安全规则，生成逐项源/目标/冲突清单。
3. 先展示批量计划并等待用户确认；冲突、malformed 或缺状态任一存在即停止整批动作。
4. 确认后逐项移动、更新 `change_status: archived` 和各 workflow 索引；失败时报告已完成/未完成清单。

## 完成标准

- 报告文件位于 command 专属目录且 scope 可从文件名判断。
- 所有状态、目录和索引变更均已重新读取验证。
- 未确认或 blocked 时没有移动、删除或宣称完成。
