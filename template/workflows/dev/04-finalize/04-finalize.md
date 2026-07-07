---
id: dev/finalize
category: dev
name: Finalize & Archive
description: 在用证据证明 change 真正完成后，改变其状态并归档；没有新鲜验证证据不许宣称完成
keywords: [finalize, verify, complete, archive, 归档, 收尾, 完成验证]
---

# Finalize & Archive 工作流执行指引

本工作流是 `dev/04` 入口：先用证据证明"真的完成了"，再改变状态并归档。

> **铁律：** 没有新鲜的验证证据，不许宣称完成。门控函数全文见 `completion-gate.md`。

> **目录命名：** `<change>` 必须为 `YYYY-MM-DD-<kebab-name>`。归档目标为 `speculo/.speculo/archive/dev/<YYYY-MM>/<change>/`。

## 阶段

| Phase | id | agent | 规范 | 模板 | 产物 |
|-------|-----|-------|------|------|------|
| 1. Completion Verification | `completion-verification` | `agents/completion-gate-agent.md` | `completion-gate.md` | `../_templates/completion-verification-template.md` | `completion-verification.md` |
| 2. Merge Back & Cleanup | `merge-cleanup` | — | `../../../skills/worktree-isolation/SKILL.md` | — | 合并后的 base 分支 |
| 3. Finalize & Archive | `finalize-archive` | — | `finalize-archive.md` | `../_templates/completion-summary-template.md` | `completion-summary.md` |

### 1. Completion Verification — 完成前验证（门控）
- id：`completion-verification`
- 完成准则：每条结论有本次运行证据；`verification_status` 为 `verified` 或 `blocked`

### 2. Merge Back & Cleanup — 合并回原分支（仅 worktree 模式）
- id：`merge-cleanup`
- 完成准则：非 worktree 模式标记 `skipped`；worktree 已合并并清理

### 3. Finalize & Archive — 状态收尾与归档
- id：`finalize-archive`
- 完成准则：`change_status` 置 `completed` 并归档；已从 `dev-status.json` 移除

## 依赖

- 软依赖：`../03-tdd/03-tdd.md` 或 `../R-review/R-review.md`，scope: same-change
- 硬依赖：无；但归档要求通过完成前验证

## 状态扩展字段

- `dev_entry` (string) — 固定为 `dev/04`
- `verification_commands` (array)
- `requirements_checklist` (array)
- `verification_status` (verified | blocked)
- `archived` (boolean)
- `archive_path` (string|null)
- `worktree_status` (created | active | merged | removed)

## 完成与状态更新

- `verification_status: blocked` 时停在本工作流，回到 `../03-tdd/03-tdd.md` 或 `../H-diagnose/H-diagnose.md`。
- `verified` 且用户确认后：worktree 模式先 Phase 2，再置 `change_status: completed` → 归档 → `archived`。

与 `../../../commands/archive.md` 的关系：本工作流面向单个 change 引导式收尾；archive 命令面向批量归档。
