---
id: dev/tdd
category: dev
name: TDD Implementation
description: 按垂直切片执行红绿重构，实现功能或回归修复
keywords: [tdd, implement, red-green-refactor, 实现, 测试]
---

# TDD Implementation 工作流执行指引

本工作流用于把 PRD、issue、诊断结论或用户明确任务实现为经过验证的代码变更。TDD 红绿重构、测试、mock 与重构指引内置在本 workflow 目录中；**深模块、接口、接缝、适配器的设计词汇与原则统一引用 `vendor/codebase-design`，本工作流不再复制**（见下「渐进披露」）。

## 内置指引

### 核心原则

测试应通过公共接口验证行为，而不是实现细节。代码可以完全重写；测试不应该。

好的测试是集成式的：它们通过公共 API 运行真实的代码路径，描述系统“做什么”，不描述“怎么做”。坏的测试与实现耦合：mock 内部协作者、测试私有方法，或通过外部手段验证内部状态。

### 反模式：水平切片

不要先写全部测试，再写全部实现。正确做法是追踪弹式垂直切片：一个测试 -> 一个实现 -> 重复。每个测试都基于上一轮学到的东西做出响应。

### 渐进披露

测试与重构相关指引内置在同目录：

- `tests.md`：设计测试方式（好测试 vs 坏测试）时读取。
- `mocking.md`：考虑 mock 边界、为可 mock 性设计接口时读取。
- `refactoring.md`：进入重构阶段、识别重构候选时读取。

深模块 / 接口 / 接缝 / 适配器 / 杠杆 / 局部性的设计词汇与原则统一由 `vendor/codebase-design` 承载（**单一事实源，本工作流不复制**），按需直接引用：

- `../../../vendor/codebase-design/SKILL.md`：设计深模块、判断深 vs 浅、为可测试性设计接口（接受依赖而非创建、返回结果而非副作用、小表面积）时读取——deep module 与可测试接口设计的权威来源。
- `../../../vendor/codebase-design/DEEPENING.md`：判定依赖类别（进程内 / 本地可替换 / 端口与适配器 / mock）与「替换而非叠加」的测试策略时读取。
- `../../../vendor/codebase-design/DESIGN-IT-TWICE.md`：需要为深化候选并行探索多个备选接口时读取。

### 消费 slices 切片契约

多阶段 change 从 `slices.md` 接手时，每个 TDD 阶段对应一个切片，须读取并守护该切片契约（见 `../I-to-issues/issues-slices.md`）：

- **保留/不动**：把切片的「保留/不动」清单当作实现硬约束——冻结常量 / 共享依赖 / 邻近功能一律不碰。
- **关键核实结论与行号现场核对**：切片记录的行号为*近似*，实现时一律以现场代码为准、不照搬。
- **验收切片**：Finish 阶段运行切片的「验收切片」；删除型切片须含残留扫描（`grep` 0 命中）并留证。
- **横切铁律**：遵守 §4 横切关注点（契约先行、删缓存可重建、数据安全冻结等）。
- **存疑即问**：计划阶段遇未决分支，按 `../I-to-issues/issues-slices.md`「存疑时的提问协议」一次一问、带推荐、逐步锁定。

## 阶段

> **产物目录：** 本工作流所有产物写入 `speculo/.speculo/dev/<change>/tdd/<phase-id>/`（见下「TDD 产物目录与阶段标识」）。下文产物路径均相对该 change 目录。**`<change>` 必须为 `YYYY-MM-DD-<kebab-name>`**（例：`2026-06-12-user-auth`）。

### 1. TDD Plan — 行为与接口计划
- 规范：`tdd-plan.md`
- 模板：`../_templates/tdd-plan-template.md`
- 产物：`tdd/<phase-id>/tdd-plan.md`
- 完成准则：
  - 已确认公共接口、关键行为和测试优先级
  - 已在产物顶部「阶段标识」段填写 `<phase-id>`
  - `tdd-plan.md` 无残留 `[TODO:]`

### 2. Slice Loop — 红绿重构循环
- 规范：`tdd-loop.md`
- 模板：`../_templates/tdd-log-template.md`
- 产物：`tdd/<phase-id>/implementation-log.md`
- 完成准则：
  - 每个切片都有 RED、GREEN、REFACTOR 和验证记录
  - `implementation-log.md` 无残留 `[TODO:]`

### 3. Finish — 验证与收尾
- 规范：`tdd-finish.md`
- 模板：`../_templates/tdd-verification-template.md`
- 产物：`tdd/<phase-id>/verification.md`
- 完成准则：
  - 已运行相关测试或明确记录无法运行原因
  - 无调试残留和推测性功能
  - 已把 slices 中该阶段 `<phase>` 状态由 `未开始` 置为 `已实现`（无 slices 则跳过，见「phase 阶段状态（XML 契约）」）
  - `verification.md` 无残留 `[TODO:]`

## TDD 产物目录与阶段标识

- 本工作流所有产物集中在 `speculo/.speculo/dev/<change>/tdd/<phase-id>/`，与 change 根目录的 PRD / slices 等产物分离，便于多阶段并行与回溯。
- `<change>` 为当前 change 目录名（`YYYY-MM-DD-<kebab-name>`）。
- `<phase-id>` 标识：
  - change 来自**多阶段 slices** 时，用 slices 阶段标识（与 slices `<phase id="...">` 的 `id` 严格一致），如 `phase0-node-base`、`phase1-templates`。
  - change 为**单阶段**（无 slices 分期）时，用一个描述性切片 slug，如 `phase0-<slug>`。
- 每个阶段独立一套 `tdd-plan.md` / `implementation-log.md` / `verification.md`，互不覆盖；模板顶部「阶段标识」段记录该 `<phase-id>`。
- 目录形如：

```text
speculo/.speculo/dev/<change>/tdd/
├── phase0-node-base/
│   ├── tdd-plan.md
│   ├── implementation-log.md
│   └── verification.md
└── phase1-templates/
    ├── tdd-plan.md
    ├── implementation-log.md
    └── verification.md
```

## phase 阶段状态（XML 契约）

多阶段 change（`speculo/.speculo/dev/<change>/slices.md`）中，每个阶段标题下紧跟一个状态标记，作为该阶段在三段生命周期中的单一事实源：

```xml
<phase id="phase0-node-base" status="未开始"><!-- 未开始 → 已实现(dev/03) → 已验证(dev/04) --></phase>
```

- `id`：阶段稳定标识，与 TDD 产物目录 `tdd/<phase-id>/` 同名。
- `status` 枚举与责任方：
  - `未开始` —— 创建 slices 文档时由作者初始化（所有阶段默认 `未开始`）。
  - `已实现` —— 本工作流（`dev/03`）该阶段 Finish 验证通过后置入。
  - `已验证` —— `dev/04`（`../04-finalize/04-finalize.md`）完成前验证通过后置入。
- 本工作流只负责 `未开始 → 已实现` 这一跳；`dev/04` 负责 `已实现 → 已验证`。状态只前进不回退，除非该阶段被显式重做。
- change 无 slices（单阶段直接任务）时本契约不适用，跳过状态翻转。

## 依赖

- 软依赖：`../02-prd/02-prd.md` 或 `../I-to-issues/I-to-issues.md`，scope: same-change
- 硬依赖：无；若用户提供明确修复或实现任务，可直接进入

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `dev_entry` (string) — 固定为 `dev/03`
- `embedded_guides` (array) — 包含 `tdd`
- `tdd_phase_id` (string) — 当前 TDD 阶段标识，与产物目录 `tdd/<phase-id>/` 及 slices `<phase>` 的 `id` 一致
- `slice_source` (prd | issues | diagnosis | user-request) — 切片来源
- `red_green_refactor_cycles` (array) — 每轮 TDD 循环摘要
- `verification_commands` (array) — 已运行或应运行的验证命令
- `implementation_status` (planned | in-progress | verified | blocked) — 实现状态

> 多阶段 change：上述自治字段按阶段命名空间记录在 `tdd_runs[<phase-id>]` 下（各含 `scope` / `artifacts`(指向 `tdd/<phase-id>/*.md`) / `red_green_refactor_cycles` / `verification_commands` / `implementation_status`），避免跨阶段互相覆盖。单阶段 change 可直接用平铺字段。

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- 每完成一个切片，追加 `red_green_refactor_cycles`（多阶段时写入 `tdd_runs[<phase-id>]`）。
- Finish 验证通过后，把 slices 中该阶段 `<phase id="<phase-id>">` 的 `status` 由 `未开始` 置为 `已实现`（无 slices 则跳过）。
- 全部用户要求的实现边界完成并验证后，可把 `change_status` 置为 `completed`，或移交 review/handoff command。
