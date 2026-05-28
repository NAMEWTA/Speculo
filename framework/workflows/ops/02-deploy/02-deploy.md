---
id: ops/deploy
category: ops
name: 部署工作流
description: 部署与回滚
keywords: [deploy, 部署, 上线]
---

# 部署工作流执行指引

本工作流把发版工作流产出的版本制品**部署到目标环境**，并强制要求每次部署同时产出"回滚预案"，确保上线后任一异常都能机械化回退。

部署本身**不做发版后观测**（观测归 `../03-monitor/`）；本工作流的边界是"部署执行完毕 + 回滚预案就绪"。

AI 进入本工作流时的前置动作：

1. 读 `../../../.speculo/ops-status.json` 锁定目标 change。
2. 读同 change 的 `release-checklist.md`；若不存在，回到 `../01-release/`。
3. 读项目 `.speculo/.config/RULES.md`（如存在），把部署相关硬约束（环境白名单、变更窗口、变更审批）载入推理上下文。
4. 长操作（构建 / 滚动升级 / Canary 推进）建议异步追踪输出，避免阻塞主推理上下文。

## 阶段

### 1. Deploy — 部署执行
- 规范：`deploy-execute.md`
- 模板：`../_templates/deploy-template.md`
- 产物：`deploy.md`
- 完成准则：
  - `deploy.md` 三章节（环境 / 部署内容 / 执行结果）填写完成，无残留 `[TODO:]`
  - "环境"段含目标环境名、集群/命名空间、配置基线（如哪份 .env 生效）
  - "部署内容"段含本次部署的版本号、涉及服务清单、涉及配置变更清单
  - "执行结果"段贴出实际部署命令输出与关键日志摘要；任何 warning/error 必须显式说明已知或待跟进
  - 部署结果三档之一：`success` / `partial` / `failed`，每档对应 `../03-monitor/` 或 `../04-incident/` 的衔接动作

### 2. Rollback Plan — 回滚预案
- 规范：`deploy-rollback.md`
- 模板：`../_templates/deploy-rollback-template.md`
- 产物：`deploy-rollback.md`
- 完成准则：
  - `deploy-rollback.md` 三章节（触发条件 / 回滚步骤 / 回滚后验证）填写完成，无残留 `[TODO:]`
  - "触发条件"段含 ≥1 个**量化指标**（如"错误率 >2% 持续 5 分钟"，"P99 延迟 >800ms 持续 5 次采样"）；不允许"觉得不对劲"这类主观触发
  - "回滚步骤"段按顺序列可执行命令，含 schema 回滚（如适用）
  - 涉及数据库 schema 变更时，必须含 down 迁移命令与本地预演输出
  - "回滚后验证"段含 ≥2 项验证（健康检查 / 关键业务接口 / 监控指标恢复任两项）

## 依赖

- 软依赖：无
- 硬依赖（未满足拒绝执行）：`../01-release/`（项目范围内必须有发版工作流产物，`prereq_checklist_passed=true`）

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `deploy_env` (string) — 目标环境（如 `prod` / `staging` / `canary-1`）
- `deploy_result` (string) — `success` / `partial` / `failed`
- `rollback_ready` (boolean) — 回滚预案是否就绪
- `rollback_triggers` (array) — 量化触发条件清单，每项 `{metric, threshold, window}`
- `schema_migrated` (boolean) — 本次部署是否涉及 schema 迁移

## 完成与状态更新

- 进入 Deploy 时：`current_phase` 置 `deploy`；`phase_history` 追加。
- Deploy 完成：写入 `deploy_env` / `deploy_result` / `schema_migrated`；置 phase `completed`。
- 进入 Rollback Plan 时：`current_phase` 置 `rollback-plan`；`phase_history` 追加。
- Rollback Plan 完成：写入 `rollback_ready=true` 与 `rollback_triggers`；置 phase `completed`。
- 部署结果分支：
  - `success`：`current_phase` 移交 `../03-monitor/`（观测窗口）
  - `partial`：保持 `current_phase`，启动 `../04-incident/` 评估
  - `failed`：立即按 `deploy-rollback.md` 执行回滚；触发 `../04-incident/`
