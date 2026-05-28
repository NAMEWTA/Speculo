> **服务工作流：** `../03-monitor/`
> **产物文件名：** `monitor.md`

# 监控报告

## 观测窗口
[TODO: 填写四字段：start_at（ISO 8601 时间）/ end_at / interval（采样间隔，如 5min）/ samples_expected（预计采样次数）。补一句话说明窗口选定理由（如"prod 全量、影响面中等，取 60min"）。]

## 指标采样
[TODO: 列四类指标（业务关键 / 性能 / 错误率 / 可用性），每类至少一项。每项含 baseline 与采样表（时间 / 指标值 / baseline / 偏差 / 是否触发）。]

## 窗口结论
[TODO: 三档之一 — pass / rollback-triggered / inconclusive。pass 简述哪些指标未达触发；rollback-triggered 列出命中条件 + 回滚执行记录 + 移交 04-incident；inconclusive 说明数据不足原因与下一步动作。]
