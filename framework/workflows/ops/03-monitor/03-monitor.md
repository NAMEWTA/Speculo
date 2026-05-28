---
id: ops/monitor
category: ops
name: 监控工作流
description: 发版后观测窗口
keywords: [monitor, 监控, 观测, canary]
---

# 监控工作流执行指引

本工作流在部署完成后开启**有时间边界的观测窗口**，按周期采样关键指标，决定"放行进入下一变更"还是"触发回滚 → 事故响应"。

与 gstack canary 模式的关键差异：**窗口必须有明确的开始 / 结束 / 采样次数**，不允许无限循环。窗口结束未触发回滚 = 隐式放行；触发回滚 = 自动衔接 `../04-incident/`。

AI 进入本工作流时的前置动作：

1. 读 `../../../.speculo/ops-status.json` 锁定目标 change。
2. 读同 change 的 `deploy.md` 与 `deploy-rollback.md`（硬依赖），把回滚预案的量化触发条件载入本工作流。
3. 读 `../../../.speculo/.config/RULES.md`（如存在），把监控相关硬约束（如必须覆盖某些 SLO）载入推理上下文。
4. 确定观测窗口长度（默认 60 分钟；按环境与变更影响面可调整为 15min / 60min / 24h）。

## 阶段

### 1. Monitor — 观测窗口
- 规范：`monitor-checklist.md`
- 模板：`../_templates/monitor-template.md`
- 产物：`monitor.md`
- 完成准则：
  - `monitor.md` 三章节（观测窗口 / 指标采样 / 窗口结论）填写完成，无残留 `[TODO:]`
  - "观测窗口"段含 `start_at` / `end_at` / `interval` / `samples_expected` 四个字段
  - "指标采样"段含 ≥4 类指标（业务关键 / 性能 / 错误率 / 可用性），每类含基线 + 实际采样表
  - "窗口结论"段三档之一：`pass`（窗口结束无触发） / `rollback-triggered`（命中回滚条件） / `inconclusive`（数据不足/采样失败，需人工判断）
  - 任一次采样命中 `deploy-rollback.md` 触发条件 → 必须立即触发回滚并衔接 `../04-incident/`

## 依赖

- 软依赖：无
- 硬依赖（未满足拒绝执行）：`../02-deploy/`（项目范围内必须有部署完成产物，`deploy_result=success` 或 `partial`）

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `monitor_window` (object) — `{start_at, end_at, interval_minutes, samples_expected, samples_taken}`
- `monitor_result` (string) — `pass` / `rollback-triggered` / `inconclusive`
- `metrics_baselines` (object) — 关键指标的部署前基线，键为指标名，值为 baseline 数值
- `rollback_invoked` (boolean) — 本次观测是否触发了回滚

## 完成与状态更新

- 进入 Monitor 时：`current_phase` 置 `monitor`；`phase_history` 追加；写入 `monitor_window.start_at`。
- 每次采样：把数据贴入 `monitor.md` "指标采样"段；与 baseline 对比；与回滚触发条件对比。
- 窗口结束（达到 `end_at`）：写入 `monitor_result` 与 `samples_taken`；置 phase `completed`。
- 命中回滚条件：立即执行 `../02-deploy/deploy-rollback.md` 的回滚步骤；把 `rollback_invoked=true` 写入；`current_phase` 移交 `../04-incident/`。
- `monitor_result=pass`：`current_phase` 可移交后续工作流（如发版结束）或置 `null` 待 ops change 归档。
- `monitor_result=inconclusive`：保持 `current_phase` 为 `monitor`，重启采样或人工接管。
