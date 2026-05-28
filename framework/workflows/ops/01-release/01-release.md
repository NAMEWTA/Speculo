---
id: ops/release
category: ops
name: 发版工作流
description: 版本发布流程
keywords: [release, 发版, 发布]
---

# 发版工作流执行指引

本工作流把 dev 全链路评审通过的代码改动**打包成可发布的版本制品**，并通过一份机械化检查清单确保前置条件全部满足，避免"AI 声称可以发版但实际遗漏关键步骤"。

发版本身**不部署到环境**（部署归 `../02-deploy/`），也**不做发版后观测**（观测归 `../03-monitor/`）。本工作流的唯一职责是"准备就绪 + 推送 tag/changelog"。

AI 进入本工作流时的前置动作：

1. 读 `../../../.speculo/ops-status.json` 与 `dev-status.json`，确认目标 change 已通过 `../../dev/05-review/`（硬依赖）。
2. 读 `../../../.speculo/.config/RULES.md`（如存在），把发版相关硬约束（如必须更新 changelog / 必须打 tag 格式）载入推理上下文。
3. 读项目 `CHANGELOG.md`（若存在），判断本次发版对应的版本号。
4. 若目标 change 尚未在 `doc/02-changelog` 工作流产出 changelog 条目，提示先回 dev → doc 后再发版。

## 阶段

### 1. Checklist — 发版检查清单
- 规范：`release-checklist.md`
- 模板：`../_templates/release-template.md`
- 产物：`release-checklist.md`
- 完成准则：
  - `release-checklist.md` 四章节（版本信息 / 前置检查 / 发版步骤 / 回滚预案）填写完成，无残留 `[TODO:]`
  - 前置检查段五项全部勾选（代码评审通过 / 测试通过 / 安全评审通过 / changelog 更新 / 依赖锁定无冲突），未通过项必须有显式接受签字
  - 发版步骤按顺序列出，可机械执行
  - 回滚预案段简述触发条件，详细预案指向 `../02-deploy/deploy-rollback.md`
  - 每项执行命令的实际输出贴入产物（不允许声称"已执行"而无输出）

## 依赖

- 软依赖：无
- 硬依赖（未满足拒绝执行）：`../../dev/05-review/`（项目范围内必须有该 change 的评审通过产物，`code_review_decision` 与 `security_review_decision` 同时为"通过"或"通过-小修+已签字"）

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `version` (string) — 发版版本号（如 `v1.4.0`、`2026.05.0`）
- `tag` (string) — 实际打入仓库的 tag 名（通常等于 version 加前缀）
- `changelog_path` (string) — 本次发版对应的 changelog 条目位置（如 `CHANGELOG.md#1-4-0`）
- `release_artifact_count` (number) — 产出的发布制品数量（如 npm 包 / docker image / release notes）
- `prereq_checklist_passed` (boolean) — 前置检查五项是否全过（含已签字接受项）

## 完成与状态更新

- 进入 Checklist 时：`current_phase` 置 `checklist`；`phase_history` 追加 `{phase: "checklist", entered_at, status: "in-progress"}`。
- 五项前置检查全部勾选 + 发版步骤实际输出贴入：把 phase 置 `completed`；写入 `version` / `tag` / `changelog_path` / `release_artifact_count` / `prereq_checklist_passed`。
- 若硬依赖未满足：`current_phase` 不推进；返回错误"请先完成 dev/05-review"。
- 本工作流完成 → `current_phase` 移交 `../02-deploy/`（如本 change 需部署）或 `../03-monitor/`（如仅发版无部署，进入直接观测）。
