# Handoff Changelog — 交接清单规范

本阶段产出**机械化、双向链接、可归档时复用**的交接清单。AI 在执行 `phase=handoff` 时读本文件作为填写指引。

## 一、上下文与产物

- **输入**：本 change 全部 dev 产物（`prd.md` / `design-*.md` / `implement.md` / `test-*.md` / `review-*.md`）；项目 `CHANGELOG.md`；`doc/02-changelog` 已产出的条目
- **产物**：`handoff.md`（基于 `../_templates/handoff-template.md`）

## 二、章节填写引导

### 向 doc 的交接
- **changelog 条目位置**：本 change 在项目 `CHANGELOG.md` 中的锚点（如 `#1-4-0-2026-05-28`）；或 `doc/02-changelog` workflow 产出的 change-name 路径
- **公开 API 变更摘要**：从 `design-api.md` 抽取"对外可见的接口变化"，作为 changelog 摘要的事实依据
- **破坏性变更标记**：若 `breaking_changes=true`（来自 implement 阶段），changelog 必须显式标 `BREAKING:` 前缀；本段列出对应改动清单
- **迁移指南指针**：若涉及破坏性变更或 schema 迁移，指向 `implement.md#关键改动说明` 或独立迁移文档

### 向 ops 的交接
对照 `../../ops/01-release/release-checklist.md` 的五项前置，确认 dev 侧已就绪：

| ops 期望 | dev 侧证据 |
|---------|----------|
| 代码评审通过 | `code_review_decision` 字段（`.status.json`） |
| 测试通过 | `test_coverage` + `ac_coverage` 字段 |
| 安全评审通过 | `security_review_decision` 字段 |
| Changelog 已更新 | 本段"向 doc 的交接"已完成 |
| 依赖锁定无冲突 | `implement.md` 中 lockfile 改动记录 |

任一项未就绪 → 不进入归档准备，回对应 phase 修订。

### 归档准备
- **待归档路径**：`../../../.speculo/dev/<change-name>/`
- **归档时机**：通常在 `ops/05-postmortem`（如有）完成后；纯 dev change 在本 phase 完成后立即可归档
- **归档命令**：由 `../../../commands/archive.md` 触发；不在本 phase 自动执行
- **不归档情形**：若发版后观测期发现需回滚或事故，待 `ops/04-incident` + `ops/05-postmortem` 完成后再决定

## 三、与 doc/02-changelog 的边界

- 本工作流**不直接写 changelog 内容**（那是 `../../doc/02-changelog/` 的职责）
- 本工作流**确认 changelog 已就绪**，并提供事实清单（公开 API 变更、破坏性变更）作为输入
- 若 doc workflow 已完成 changelog，handoff.md 引用其位置即可

## 四、与 commands/archive.md 的边界

- 本工作流**不执行归档**（归档是 archive 命令的强制用户确认动作）
- 本工作流**确认归档前置就绪**，并把 `archive_ready` 占位写好
- ops 流程完成后由 ops 工作流（postmortem）把 `archive_ready` 置 true

## 五、完成准则（机器可验证）

- `grep -c '\[TODO:' handoff.md` = 0
- 文件含 `## 向 doc 的交接` / `## 向 ops 的交接` / `## 归档准备` 三个标题
- "向 doc" 段含 `CHANGELOG.md` 或 `doc/02-changelog` 引用
- "向 ops" 段含五项 ops 期望对照表（≥5 行）
- "归档准备" 段含待归档目录路径
- `handoff_to_doc=true` 与 `handoff_to_ops=true` 写入 `.status.json`
