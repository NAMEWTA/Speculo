---
id: dev/review
category: dev
name: 评审工作流
description: 代码与安全评审
keywords: [评审, review, 审查, security]
---

# 评审工作流执行指引

本工作流对前序产物（PRD / design / implement / test）做**双视角合规审查**：代码视角（功能、质量、可维护性）与安全视角（OWASP / 数据安全 / 依赖漏洞）。本工作流是 dev 全链路的最后一道把关，完成后把抽象错误总结追加到 `../../../.speculo/.config/LESSONS.md`，形成跨 change 失败知识库。

**写作通道与审查通道分离**：评审者**不修改被审代码**，仅产报告与修订建议；修订动作回 `../03-implement/` 完成后重审。

AI 进入本工作流时的前置动作：

1. 读 `../../../.speculo/dev-status.json` 锁定目标 change。
2. 读同 change 全部前置产物：`prd.md` / `design-arch.md` / `design-api.md` / `implement.md` / `test-unit.md` / `test-e2e.md`。
3. 读 `../../../.speculo/.config/{RULES.md, CONVENTIONS.md, LESSONS.md}`，把项目级强制约束与历史失败模式载入推理上下文。
4. 推荐切换更强模型（如 opus 等）做深度推理；若可调用跨 AI 工具，做一次"跨模型 spot-check"（可选优化项）。

## 阶段

### 1. Code — 代码评审
- 规范：`review-code.md`
- 模板：`../_templates/review-code-template.md`
- 产物：`review-code.md`
- 完成准则：
  - `review-code.md` 三章节（评审决议 / 问题清单 / 建议性改进）填写完成，无残留 `[TODO:]`
  - 评审决议三档之一：`通过` / `通过-小修` / `不通过`
  - 问题按严重度三档分类：`block`（阻塞） / `major`（建议必修） / `minor`（提示），每条带 `文件:行号` 或 `产物文件#段` 引用
  - 完成 5 项强制检查：AC 覆盖 / 范围未蔓延 / 与 RULES.md 不冲突 / 测试金字塔完整 / 反复用与反幻觉 grep 核验
  - `block` 项 0 容忍才允许决议为"通过"；`major` 项的处理须经用户显式签字（写入产物文末）

### 2. Security — 安全评审
- 规范：`review-security.md`
- 模板：`../_templates/review-security-template.md`
- 产物：`review-security.md`
- 完成准则：
  - `review-security.md` 三章节（评审决议 / 风险清单 / 修复建议）填写完成，无残留 `[TODO:]`
  - 风险按 OWASP Top 10 类别 + 严重度三档分类
  - 完成 5 项强制扫描：注入 / 鉴权与会话 / 数据暴露 / 依赖漏洞 / 日志与脱敏
  - 任一 `critical` 风险未修复 → 决议必须为"不通过"
  - 修复建议每条对应风险编号，给出方向（非完整代码）

## 依赖

- 软依赖（建议先做）：`../04-test/`（同一 change 下）
- 硬依赖：无

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `code_review_decision` (string) — `通过` / `通过-小修` / `不通过`
- `security_review_decision` (string) — `通过` / `不通过`
- `block_issues_count` (number) — 代码评审 block 项总数
- `critical_security_count` (number) — 安全评审 critical 风险数
- `lessons_appended` (boolean) — 本次评审是否已写回 LESSONS.md

## 完成与状态更新

- 进入 Code 时：`current_phase` 置 `code-review`；`phase_history` 追加。
- Code 完成：写入 `code_review_decision` 与 `block_issues_count`；置 phase `completed`。
- 进入 Security 时：`current_phase` 置 `security-review`；`phase_history` 追加。
- Security 完成：写入 `security_review_decision` 与 `critical_security_count`；置 phase `completed`。
- **必做收尾**：把本次评审抽象出的失败模式追加到 `../../../.speculo/.config/LESSONS.md`，并把 `lessons_appended` 置 true。失败模式范例：
  - "未对 X 类输入做边界校验导致 Y" → 沉淀为 LESSONS 条目供下次 prd-core / implement 阶段 grep
- 双 phase 完成且决议均为"通过"或"通过-小修+已签字"：`current_phase` 移交下游（如 `../06-handoff/`）；否则保持 `active` 等修订后重审。
