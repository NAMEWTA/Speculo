---
id: dev/test
category: dev
name: 测试工作流
description: 单元与端到端测试
keywords: [测试, test, 单测, e2e]
---

# 测试工作流执行指引

本工作流为已实现的代码改动建立**与 PRD 验收标准（AC）一一对照的测试覆盖**，覆盖单元、集成、端到端、性能、安全、兼容、可观测七个维度（按需）。

测试的唯一真相源是 `prd.md` 的"验收标准"段：禁止从实现派生测试用例。

AI 进入本工作流时的前置动作：

1. 读 `../../../.speculo/dev-status.json` 锁定目标 change。
2. 读同 change 的 `prd.md`（必读，AC 派生源）、`implement.md`（实现概要）、`design-api.md`（端点契约）。
3. 读 `../../../.speculo/.config/{RULES.md, CONVENTIONS.md, LESSONS.md}`；命中"测试相关历史失败"必须显式声明本次差异。

## 阶段

### 1. Unit — 单元测试
- 规范：`test-unit.md`
- 模板：`../_templates/test-unit-template.md`
- 产物：`test-unit.md`
- 完成准则：
  - `test-unit.md` 三章节（测试范围 / 用例设计 / 覆盖率）填写完成，无残留 `[TODO:]`
  - "测试范围"段列出本 change 涉及的全部模块/函数（与 `implement.md` 实现概要一致）
  - 每条 PRD AC 至少对应 1 个单测用例（含 AC 编号 → 测试文件:测试名 映射表）
  - 边界用例段含 ≥4 类：空 / null / 极值 / Unicode/特殊字符 / 错误路径中的至少 4 种
  - 覆盖率段贴出实际命令输出；未达项目门槛需在文中说明理由
  - 推荐 TDD 顺序（先写测试 → 确认失败 → 实现 → 通过），但非强制

### 2. E2E — 端到端测试
- 规范：`test-e2e.md`
- 模板：`../_templates/test-e2e-template.md`
- 产物：`test-e2e.md`
- 完成准则：
  - `test-e2e.md` 三章节（测试场景 / 环境配置 / 已知限制）填写完成，无残留 `[TODO:]`
  - "测试场景"段每条含 `前置条件 / 执行步骤 / 验收点`
  - 性能 / 安全 / 兼容 / 可观测四维度在"测试场景"段或独立小节中各自给出"已覆盖 / 不适用 / 跳过 + 理由"声明（不允许沉默跳过）
  - 至少 1 条 UAT（用户验收测试）脚本，含执行人、时间、实际结果
  - "已知限制"段非空（如全部覆盖则显式写"无未覆盖场景"）

## 依赖

- 软依赖（建议先做）：`../03-implement/`（同一 change 下）
- 硬依赖：无

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `test_coverage` (object) — 覆盖率快照，至少 `{lines: number, branches: number, threshold: number}`
- `ac_coverage` (object) — PRD AC 覆盖映射，键为 `AC-N`，值为 `{tests: [...], status: "covered" | "uncovered" | "skipped"}`
- `e2e_pyramid` (object) — 端到端五维度状态，键为 `functional` / `performance` / `security` / `compat` / `observability`，值为 `covered` / `skipped` / `n/a`

## 完成与状态更新

- 进入 Unit 时：`current_phase` 置 `unit`；`phase_history` 追加。
- Unit 完成：写入 `test_coverage` 与 `ac_coverage`（基于单测覆盖的 AC）；置 phase 为 `completed`。
- 进入 E2E 时：`current_phase` 置 `e2e`；`phase_history` 追加。
- E2E 完成：补全 `ac_coverage` 中尚未覆盖的 AC；写入 `e2e_pyramid` 五字段；置 phase 为 `completed`；`current_phase` 移交 `../05-review/`。
- 任一 AC 标 `uncovered`：触发"测试漏洞"，必须显式在 review 阶段评估是否阻塞。
