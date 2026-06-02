---
id: ops/index
category: ops
name: Ops Workflow Index
description: 运维工作流预留导航入口
keywords: [ops, release, deploy, 运维]
---

# Ops Workflow Index

ops workflow 分类当前为预留入口。本 framework 构建已补齐 `.speculo/ops-status.json` 和归档骨架，尚未内置具体 ops workflow。

## 进入协议

1. 读取 `../../.speculo/ops-status.json`。
2. 若存在 active changes，汇报其 `current_phase` 和 `updated_at`。
3. 若用户要求发布、部署、事故或复盘工作流，说明当前未内置具体 ops workflow，并建议按 `docs/workflow-authoring.md` 新增。

## 阶段

当前无内置阶段。

## 依赖

- 软依赖：无
- 硬依赖：无

## 状态扩展字段

无。

## 完成与状态更新

本入口不创建 change；具体 ops workflow 新增后由该 workflow 自治维护状态。
