---
id: change-lifecycle
type: skill
name: Change Lifecycle
description: 验证、完成和归档任意 Speculo workflow change，返回可确认的状态与目录移动计划。
---

# Change Lifecycle

## 输入

- `runtime-context` 返回的 workflow、state、changes、archive 和可选 change 根。
- `mode: finalize-active | archive-completed`。
- 当前 route/phase 完成准则、change 状态与可选 worktree 状态。

## 流程

1. `finalize-active` 按 `references/completion-gate.md` 收集新鲜证据；任一关键结论缺证据即返回 blocked。
2. 两种模式均按 `references/finalize-archive.md` 验证名称、状态、索引和目标冲突。
3. 返回状态修改、移动、索引更新和可选 worktree 清理计划，等待调用方取得用户确认。
4. 调用方执行后重新读取源、目标、change 状态和 workflow 索引；存在部分完成即返回 blocked。

完成标准：返回 `verified | blocked | archived` 中唯一裁决及完整证据；本 skill 未自行持久化或执行未确认的破坏性动作。

报告模板见 `assets/completion-verification-template.md` 与 `assets/completion-summary-template.md`。
