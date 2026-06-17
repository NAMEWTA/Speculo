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

## 内置指引

### 何时使用

当用户想审查分支、PR、进行中的变更，或要求 `review since <fixed-point>` 时使用。

### 三个审查维度

三个维度是三种独立的"镜头"，**不合并、不重排、不让一个维度的结论掩盖另一个**：

| 维度 | 问题 | 关注 |
|------|------|------|
| **Spec** | 做对了吗？ | 是否忠实实现来源 issue / PRD / spec：缺失需求、范围蔓延、看似实现但有问题的需求 |
| **Engineering** | 做好了吗？ | 不依赖成文规则的工程质量：SOLID 与架构、安全与可靠性、错误处理、性能、边界、死代码 |
| **Standards** | 合规吗？ | 是否违反仓库**已记录**的标准：RULES、ADR、CONTRIBUTING、lint / 格式 / 类型配置 |

若缺少 spec，Spec 维度跳过并报告 `no spec available`；若仓库无成文标准，Standards 维度报告检查范围并说明覆盖空白。Engineering 维度始终执行。

### 严重度模型

每条 finding 必须标注严重度：

| 级别 | 名称 | 含义 | 动作 |
|------|------|------|------|
| **P0** | Critical | 安全漏洞、数据丢失风险、正确性 bug | 必须阻断合并 |
| **P1** | High | 逻辑错误、显著 SOLID 违背、性能回退、关键需求缺失 | 合并前应修复 |
| **P2** | Medium | 代码异味、可维护性隐患、轻微 SOLID 违背、范围蔓延 | 本 PR 修或建后续项 |
| **P3** | Low | 风格、命名、小建议 | 可选改进 |

### 执行原则

- 用户说的任何东西都是固定点。若用户没有指定固定点，先询问；拿到前不要继续。
- 比较命令使用三点语法：`git diff <fixed-point>...HEAD`，同时记录 `git log <fixed-point>..HEAD --oneline`。
- **Worktree 模式**：若当前 change 为 worktree 隔离模式（`.status.json` 的 `worktree_enabled` 为真），fixed point 默认取 `base_branch`，且审查必须完整覆盖 change 分支树 `base_branch..change_branch` 的**每一个 commit**，不能只看最新工作区状态。此时读取 `../../../skills/worktree-isolation/SKILL.md` 的 `references/audit-branch-tree.md`；非 worktree 模式不读取该 skill。
- **Review-first**：本工作流默认只产出审查结论，**不修改代码**；除非用户在看到 findings 后明确授权修复。
- **诚实优先**：无法覆盖的区域要显式声明（见 `review-verdict.md` 的 clean-review 要求），不得用"看起来没问题"代替实际检查。
- 机器已强制的标准（lint / 类型 / 格式）只记录来源，不重复人工检查工具已覆盖的内容。
- 如果环境支持并行子代理，三个维度应并行执行；如果不支持，按三个独立上下文顺序执行，并在报告中保持分离。

### 渐进披露（Engineering 维度深度清单）

进入 Engineering 维度审查时，按需读取同目录清单：

- `solid-checklist.md`：检查 SOLID 违背与架构异味、给重构启发式时读取。
- `security-checklist.md`：检查安全漏洞、竞态、密钥、密码学与运行时风险时读取。
- `code-quality-checklist.md`：检查错误处理、性能 / 缓存、边界条件时读取。
- `removal-checklist.md`：识别死代码与删除候选、产出删除 / 推迟计划时读取。

### 独立使用

本工作流**零硬依赖**，无需预先执行 dev/01、dev/02、dev/I 等其他工作流即可独立进入。只需用户提供 fixed point（分支/commit/tag）+ 当前 git 仓库即可启动。

**独立进入流程：**

1. **fixed point**：若用户未指定，先询问；拿到前不继续。在 worktree 模式下默认取 `base_branch`。
2. **change 目录**：若用户未指定 `<change>` 目录，按 `YYYY-MM-DD-<kebab-name>` 格式创建（如 `2026-06-17-review-auth-refactor`），初始化 `.status.json` 并更新 `dev-status.json`。
3. **信息自采集**：若同 change 目录下无上游产物（PRD、slices、decision-log 等），**自行通过代码库探索采集审查所需上下文**，不要求用户先执行其他工作流：
   - `git log <fixed-point>..HEAD --oneline` 提取 commit message 中的 issue/PR 引用
   - 搜索仓库中与变更模块匹配的 spec 文档、README、设计文档
   - 从代码注释、TODO/FIXME 和 commit message 正文推断需求意图
   - 搜索 `speculo/.speculo/.config/RULES.md`、`speculo/.speculo/.config/adr/`、`AGENTS.md`、`CONTRIBUTING.md` 获取标准来源
   - 搜索 `.editorconfig`、`eslint.config.*`、`biome.json`、`prettier.config.*`、`tsconfig.json` 获取机器强制标准
4. **深度搜索**：Spec 和 Standards 来源仍不足时：
   - 对关键路径（auth/支付/数据写入/网络）执行额外的代码库考古（`git log -p -- <path>`）
   - 搜索 `speculo/.speculo/doc/` 和 `speculo/.speculo/archive/` 中的领域文档
   - 检查变更模块的现有测试文件以推断预期行为
5. **诚实优先**：找不到 spec 时明确记录 `no spec available`，不编造；找不到成文标准时记录覆盖空白，不把缺失当作"无问题"。Engineering 维度始终执行，不依赖任何外部产物。

### 缺少 change 目录时的自初始化

若当前无对应 change 目录，按以下步骤创建：

1. 从审查意图提取 `<kebab-name>`（如 `review-auth-refactor`、`review-api-changes`）
2. 创建 `speculo/.speculo/dev/<YYYY-MM-DD>-<kebab-name>/`
3. 初始化 `.status.json`：
   ```json
   {
     "dev_entry": "dev/R",
     "current_phase": "1. Review Setup",
     "phase_history": [],
     "change_status": "active",
     "review_fixed_point": null,
     "review_diff_command": null,
     "review_axes": ["spec", "engineering", "standards"],
     "standards_sources": [],
     "spec_sources": [],
     "severity_summary": { "p0": 0, "p1": 0, "p2": 0, "p3": 0 },
     "review_verdict": null,
     "review_status": "collecting"
   }
   ```
4. 在 `speculo/.speculo/dev-status.json` 的 `active` 数组中追加该 change 目录名

## 阶段

### 1. Review Setup — 固定点、范围与来源收集
- 规范：`review-setup.md`
- 模板：`../_templates/review-sources-template.md`
- 产物：`review-sources.md`
- 完成准则：
  - 已记录 fixed point、diff 命令、commit 列表、diff 规模与分批策略
  - 已列出 standards 来源与 spec 来源，或记录各自缺失
  - 已标识关键路径（auth / 支付 / 数据写入 / 网络）
  - `review-sources.md` 无残留 `[TODO:]`

### 2. Multi-Axis Review — 三维度审查
- 规范：`review-axes.md`
- 模板：`../_templates/review-report-template.md`
- 产物：`review-report.md`
- 完成准则：
  - Spec / Engineering / Standards 分区独立呈现，不合并、不重排
  - 每条 finding 带严重度（P0–P3）、文件/行或 hunk 依据，以及对应 spec / 清单 / 标准引用
  - `review-report.md` 无残留 `[TODO:]`

### 3. Verdict & Next Steps — 裁决与后续确认
- 规范：`review-verdict.md`
- 模板：`../_templates/review-verdict-template.md`
- 产物：`review-verdict.md`
- 完成准则：
  - 给出整体裁决（APPROVE / REQUEST_CHANGES / COMMENT）与严重度汇总
  - 完成 clean-review 声明：检查了什么、未覆盖什么、残留风险
  - 已向用户给出后续选项，未经确认不实施修复
  - `review-verdict.md` 无残留 `[TODO:]`

## 依赖

- 硬依赖：无；用户提供 fixed point 即可进入
- 软依赖：无。若同 change 目录下存在其他工作流产物（如 prd.md、slices.md、decision-log.md），可继承其信息增强 Spec 维度审查；缺失时自行采集（commit message、代码注释、项目文档），不阻塞流程。审查完成后是否进入修复（`../03-tdd/03-tdd.md`）或归档（`../04-finalize/04-finalize.md`）由用户决定。

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `dev_entry` (string) — 固定为 `dev/R`
- `review_fixed_point` (string) — 用户提供的比较点
- `review_diff_command` (string) — 实际使用的 diff 命令
- `review_axes` (array) — 实际执行的维度，取值自 `spec` | `engineering` | `standards`
- `standards_sources` (array) — Standards 审查读取的规则来源
- `spec_sources` (array) — Spec 审查读取的规格来源
- `severity_summary` (object) — 各严重度 finding 计数：`{ "p0": n, "p1": n, "p2": n, "p3": n }`
- `review_verdict` (approve | request_changes | comment | null) — 整体裁决
- `review_status` (collecting | reviewing | judged | completed | blocked) — 审查状态

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- 完成 setup 后写入 fixed point、diff 命令、`review_axes` 和来源清单。
- 完成报告后更新 `severity_summary`，置 `review_status: judged`。
- 完成裁决后写入 `review_verdict`，置 `review_status: completed`；但不自动完成 change —— 是否进入修复（`../03-tdd/03-tdd.md`）、收尾归档（`../04-finalize/04-finalize.md`）或其他动作由用户决定。
