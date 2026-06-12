> **服务工作流：** `../R-review/R-review.md`
> **产物文件名：** `review-report.md`
> **父目录规则：** 本模板产物写入 `YYYY-MM-DD-<kebab-name>/` change 目录内

# Review Report

> 每条 finding 格式：`[严重度] [file:line 或 hunk] 标题` + 问题描述 + 修复建议 + 来源引用。
> 严重度取值 P0 / P1 / P2 / P3，见 `../R-review/R-review.md` 的严重度模型。

## Spec

[TODO: 按 Spec 维度列出 findings（缺失需求、范围蔓延、看似实现但有问题的需求），引用 spec 原文。缺失 spec 时写 `no spec available`。]

## Engineering

### SOLID 与架构
[TODO: 依据 `../R-review/solid-checklist.md` 列出 findings。]

### 安全与可靠性
[TODO: 依据 `../R-review/security-checklist.md` 列出 findings，含可利用性与影响。]

### 代码质量
[TODO: 依据 `../R-review/code-quality-checklist.md` 列出 findings。]

### 删除候选
[TODO: 依据 `../R-review/removal-checklist.md` 列出死代码 / 删除候选与计划。]

## Standards

[TODO: 按 Standards 维度列出违反已记录标准的 findings，引用标准来源；无成文标准时记录覆盖空白。]
