---
id: dev/R-review
category: dev
name: Review
description: 从固定比较点开始，按 Spec、Engineering、Standards 三个独立维度审查当前 diff，并给出带严重度的裁决
keywords: [review, diff, spec, engineering, standards, security, solid, pr, 审查]
---

# Review 工作流执行指引

本工作流是 `dev/R` 入口，用于审查 `HEAD` 与用户提供的固定点之间的 diff。审查以**资深工程师视角**进行，结果必须分成三个**互相独立、互不掩盖**的维度，每条 finding 带严重度，最后给出整体裁决。

> **目录命名：** `<change>` 必须为 `YYYY-MM-DD-<kebab-name>`（例：`2026-06-12-review-auth-module`）。审查产物写入 `speculo/.speculo/dev/<change>/`。

## 何时使用

当用户想审查分支、PR、进行中的变更，或要求 `review since <fixed-point>` 时使用。

## 三个审查维度

| 维度 | 问题 | 关注 |
|------|------|------|
| **Spec** | 做对了吗？ | 是否忠实实现来源 issue / PRD / spec |
| **Engineering** | 做好了吗？ | 工程质量：SOLID、安全、错误处理、性能、边界、死代码 |
| **Standards** | 合规吗？ | 是否违反仓库已记录的标准 |

详细严重度模型、独立进入流程与来源深度搜索见 `review-setup.md`。

## 阶段

| Phase | id | agent | 规范 | 模板 | 产物 |
|-------|-----|-------|------|------|------|
| 1. Review Setup | `review-setup` | — | `review-setup.md` | `../_templates/review-sources-template.md` | `review-sources.md` |
| 2. Multi-Axis Review | `multi-axis-review` | `agents/spec-review-agent.md`、`agents/engineering-review-agent.md`、`agents/standards-review-agent.md` | `review-axes.md` | `../_templates/review-report-template.md` | `review-report.md` |
| 3. Verdict & Next Steps | `verdict-next-steps` | — | `review-verdict.md` | `../_templates/review-verdict-template.md` | `review-verdict.md` |

### 1. Review Setup — 固定点、范围与来源收集
- id：`review-setup`
- 完成准则：fixed point、diff 命令、来源清单已记录；`review-sources.md` 无残留 `[TODO:]`

### 2. Multi-Axis Review — 三维度审查
- id：`multi-axis-review`
- 完成准则：三维度分区独立呈现；每条 finding 带 P0–P3 严重度；`review-report.md` 无残留 `[TODO:]`

### 3. Verdict & Next Steps — 裁决与后续确认
- id：`verdict-next-steps`
- 完成准则：整体裁决与 clean-review 声明已给出；未经确认不实施修复；`review-verdict.md` 无残留 `[TODO:]`

## 依赖

- 硬依赖：无；用户提供 fixed point 即可进入
- 软依赖：同 change 下若有 `prd.md`、`slices.md` 等可继承增强 Spec 维度；缺失时自行采集，不阻塞流程

## 状态扩展字段

- `dev_entry` (string) — 固定为 `dev/R`
- `review_fixed_point` (string)
- `review_diff_command` (string)
- `review_axes` (array) — `spec` | `engineering` | `standards`
- `standards_sources` (array)
- `spec_sources` (array)
- `severity_summary` (object) — `{ "p0": n, "p1": n, "p2": n, "p3": n }`
- `review_verdict` (approve | request_changes | comment | null)
- `review_status` (collecting | reviewing | judged | completed | blocked)

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- 完成 setup 后写入 fixed point、diff 命令、`review_axes` 和来源清单。
- 完成报告后更新 `severity_summary`，置 `review_status: judged`。
- 完成裁决后写入 `review_verdict`，置 `review_status: completed`；不自动完成 change —— 是否进入修复（`../03-tdd/03-tdd.md`）、收尾（`../04-finalize/04-finalize.md`）由用户决定。

### 缺少 change 目录时

若无 active change，执行 `../AGENTS.md` 进入协议步骤 3（原子三步），不得内联自初始化 JSON。
