---
id: dev/R-review
category: dev
name: Review
description: 从固定比较点开始，按 Standards 与 Spec 两个维度审查当前 diff
keywords: [review, diff, standards, spec, pr, 审查]
---

# Review 工作流执行指引

本工作流是 `dev/R` 入口，用于审查 `HEAD` 与用户提供的固定点之间的 diff。审查结果必须分成两个并行维度：Standards 与 Spec，避免一个维度掩盖另一个维度。

## 内置指引

### 何时使用

当用户想审查分支、PR、进行中的变更，或要求 `review since <fixed-point>` 时使用。

### 输入

- 固定比较点：commit SHA、分支名、tag、`main`、`HEAD~5` 等
- 当前 change 目录：`.speculo/dev/<change>/`
- 可发现的标准来源：`.speculo/.config/RULES.md`、`.speculo/.config/context/`、`.speculo/.config/adr/`、`AGENTS.md`、`CONTRIBUTING.md`、配置文件等
- spec 来源：当前 change 的 PRD、slices、用户提供路径、commit message 中引用的 issue 或其他规格文档

### 输出

- `.speculo/dev/<change>/review-sources.md`
- `.speculo/dev/<change>/review-report.md`
- Standards 与 Spec 两个分区的 findings，不合并、不重排

### 执行原则

用户说的任何东西都是固定点。若用户没有指定固定点，先询问固定点；拿到前不要继续。

比较命令使用三点语法：`git diff <fixed-point>...HEAD`。同时记录 `git log <fixed-point>..HEAD --oneline`。

Standards 维度检查 diff 是否违反仓库已记录标准；Spec 维度检查 diff 是否忠实实现来源 issue、PRD 或 spec。若缺少 spec，Spec 维度跳过并报告 `no spec available`。

如果环境支持并行子代理，Standards 与 Spec 审查应并行执行；如果不支持，按两个独立上下文顺序执行，并在报告中保持分离。

## 阶段

### 1. Review Setup — 固定点与来源收集
- 规范：`review-setup.md`
- 模板：`../_templates/review-sources-template.md`
- 产物：`review-sources.md`
- 完成准则：
  - 已记录 fixed point、diff 命令、commit 列表
  - 已列出 standards 来源和 spec 来源，或记录 spec 缺失
  - `review-sources.md` 无残留 `[TODO:]`

### 2. Two-Axis Review — 双维度审查
- 规范：`review-two-axis.md`
- 模板：`../_templates/review-report-template.md`
- 产物：`review-report.md`
- 完成准则：
  - Standards 与 Spec 分区独立呈现
  - 每条 finding 有文件/行或 hunk 依据，以及对应标准或 spec 引用
  - `review-report.md` 无残留 `[TODO:]`

## 依赖

- 软依赖：`../02-prd/02-prd.md` 或 `../I-to-issues/I-to-issues.md`，scope: same-change
- 硬依赖：无；用户提供 fixed point 即可进入

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `dev_entry` (string) — 固定为 `dev/R`
- `review_fixed_point` (string) — 用户提供的比较点
- `review_diff_command` (string) — 实际使用的 diff 命令
- `standards_sources` (array) — Standards 审查读取的规则来源
- `spec_sources` (array) — Spec 审查读取的规格来源
- `review_status` (collecting | reviewing | completed | blocked) — 审查状态

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- 完成 setup 后写入 fixed point、diff 命令和来源清单。
- 完成报告后更新 `review_status`，但不自动完成 change；是否进入修复或收尾由用户决定。
