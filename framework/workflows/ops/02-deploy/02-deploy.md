---
id: ops/deploy
category: ops
name: 部署工作流
description: 部署与回滚
keywords: [deploy, 部署, 上线]
---

# 部署工作流执行指引

[TODO: 简介本工作流目的；AI 进入时的前置动作。]

## 阶段

### 1. Deploy — 部署执行
- 规范：[TODO 创建独立 phase 文件]
- 模板：`../_templates/deploy-template.md`
- 产物：`deploy.md`
- 完成准则：[TODO]

### 2. Rollback Plan — 回滚预案
- 规范：`deploy-rollback.md`
- 模板：`../_templates/deploy-rollback-template.md`
- 产物：`deploy-rollback.md`
- 完成准则：[TODO]

## 依赖

- 软依赖：无
- 硬依赖（未满足拒绝执行）：`../01-release/`（项目范围内必须有发版工作流产物）

## 状态扩展字段

[TODO]

## 完成与状态更新

[TODO]
