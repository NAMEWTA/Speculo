---
id: dev/prd
category: dev
name: PRD 工作流
description: 需求定义与评审
keywords: [prd, 需求, feature, 产品]
---

# PRD 工作流执行指引

[TODO: 简介本工作流目的；AI 进入时的前置消歧动作（消歧当前 active change、若无则提示创建）。]

## 阶段

### 1. Core — 核心 PRD 填写
- 规范：`prd-core.md`
- 模板：`../_templates/prd-template.md`
- 产物：`prd.md`
- 完成准则：[TODO]

### 2. Review — 评审
- 规范：`prd-review.md`
- 模板：`../_templates/prd-review-template.md`
- 产物：`prd-review.md`
- 完成准则：[TODO]

## 依赖

- 软依赖：无
- 硬依赖：无

## 状态扩展字段

[TODO: 如需在 `.status.json` 追加 stakeholders / priority 等字段，在此声明。]

## 完成与状态更新

[TODO: 每个 phase 完成时写入 `.status.json` 的具体动作；全部 phase 完成 → `change_status: completed`。]
