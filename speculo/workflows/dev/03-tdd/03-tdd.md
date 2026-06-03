---
id: dev/tdd
category: dev
name: TDD Implementation
description: 按垂直切片执行红绿重构，实现功能或回归修复
keywords: [tdd, implement, red-green-refactor, 实现, 测试]
---

# TDD Implementation 工作流执行指引

本工作流用于把 PRD、issue、诊断结论或用户明确任务实现为经过验证的代码变更。TDD 红绿重构、测试、mock、接口设计、deep module 和重构指引已内置在本 workflow 目录中。

## 内置指引

### 核心原则

测试应通过公共接口验证行为，而不是实现细节。代码可以完全重写；测试不应该。

好的测试是集成式的：它们通过公共 API 运行真实的代码路径，描述系统“做什么”，不描述“怎么做”。坏的测试与实现耦合：mock 内部协作者、测试私有方法，或通过外部手段验证内部状态。

### 反模式：水平切片

不要先写全部测试，再写全部实现。正确做法是追踪弹式垂直切片：一个测试 -> 一个实现 -> 重复。每个测试都基于上一轮学到的东西做出响应。

### 渐进披露

- `tests.md`：设计测试方式时读取。
- `mocking.md`：考虑 mock 边界时读取。
- `deep-modules.md`：识别深模块机会时读取。
- `interface-design.md`：设计可测试公共接口时读取。
- `refactoring.md`：进入重构阶段时读取。

## 阶段

### 1. TDD Plan — 行为与接口计划
- 规范：`tdd-plan.md`
- 模板：`../_templates/tdd-plan-template.md`
- 产物：`tdd-plan.md`
- 完成准则：
  - 已确认公共接口、关键行为和测试优先级
  - `tdd-plan.md` 无残留 `[TODO:]`

### 2. Slice Loop — 红绿重构循环
- 规范：`tdd-loop.md`
- 模板：`../_templates/tdd-log-template.md`
- 产物：`implementation-log.md`
- 完成准则：
  - 每个切片都有 RED、GREEN、REFACTOR 和验证记录
  - `implementation-log.md` 无残留 `[TODO:]`

### 3. Finish — 验证与收尾
- 规范：`tdd-finish.md`
- 模板：`../_templates/tdd-verification-template.md`
- 产物：`verification.md`
- 完成准则：
  - 已运行相关测试或明确记录无法运行原因
  - 无调试残留和推测性功能
  - `verification.md` 无残留 `[TODO:]`

## 依赖

- 软依赖：`../02-prd/02-prd.md` 或 `../I-to-issues/I-to-issues.md`，scope: same-change
- 硬依赖：无；若用户提供明确修复或实现任务，可直接进入

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `dev_entry` (string) — 固定为 `dev/03`
- `embedded_guides` (array) — 包含 `tdd`
- `slice_source` (prd | issues | diagnosis | user-request) — 切片来源
- `red_green_refactor_cycles` (array) — 每轮 TDD 循环摘要
- `verification_commands` (array) — 已运行或应运行的验证命令
- `implementation_status` (planned | in-progress | verified | blocked) — 实现状态

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- 每完成一个切片，追加 `red_green_refactor_cycles`。
- 全部用户要求的实现边界完成并验证后，可把 `change_status` 置为 `completed`，或移交 review/handoff command。
