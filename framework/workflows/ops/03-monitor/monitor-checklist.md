# Monitor Checklist — 观测窗口规范

本阶段把"发版后观测"从"凭感觉"变成"有窗口、有采样、有结论"的机械化流程。AI 在执行 `phase=monitor` 时读本文件作为操作手册。

## 一、上下文与产物

- **输入**：本 change 的 `deploy.md`、`deploy-rollback.md`；项目监控配置（Prometheus / Datadog / Grafana / 自建 dashboard 任一）
- **产物**：`monitor.md`（基于 `../_templates/monitor-template.md`）
- **核心约束**：窗口有明确开始、结束、采样次数；不允许"看着 dashboard 等出事"这种无界循环

## 二、章节填写引导

### 观测窗口
四字段必填：

| 字段 | 含义 | 示例 |
|------|------|------|
| `start_at` | 观测开始时间（ISO 8601） | `2026-05-28T14:00:00Z` |
| `end_at` | 观测结束时间 | `2026-05-28T15:00:00Z` |
| `interval` | 采样间隔 | `5min` |
| `samples_expected` | 预计采样次数 | `12`（60min ÷ 5min） |

窗口长度建议：

| 环境 / 变更影响面 | 建议窗口 |
|------------------|---------|
| `staging` 全量 | 15min |
| `prod` 小规模 / 低风险 | 60min |
| `prod` 大规模或敏感 | 24h（含至少一个业务高峰） |
| Canary 单批次 | 15-30min |

### 指标采样
按四类指标采样，每类至少一项：

| 类别 | 指标示例 |
|------|---------|
| 业务关键 | 订单创建成功率、用户登录率、关键页面 PV |
| 性能 | P50/P95/P99 延迟、吞吐 RPS、队列堆积 |
| 错误率 | 5xx 比例、客户端 JS 错误、依赖调用失败率 |
| 可用性 | 健康检查通过率、SLO 燃尽预算消耗 |

每类指标的采样表：

| 时间 | 指标值 | baseline | 偏差 | 触发？ |
|------|-------|---------|------|--------|
| T0+5min | ... | ... | ... | 否 |
| T0+10min | ... | ... | ... | 否 |

### 窗口结论
三档：
- `pass`：窗口结束，所有指标未命中回滚触发条件
- `rollback-triggered`：任一指标命中触发条件 → 自动执行 `deploy-rollback.md`，状态移交 `../04-incident/`
- `inconclusive`：采样失败 / 数据不足 / 监控系统故障 → 不能贸然放行，必须人工接管

## 三、触发条件与回滚的衔接

回滚条件来自 `deploy-rollback.md`"## 触发条件"段。本工作流**只判断是否命中**，不重新设计条件：

```
for each sample:
    for each rollback_trigger in deploy-rollback.md:
        if metric matches trigger.metric and value crosses trigger.threshold within trigger.window:
            invoke rollback steps
            set monitor_result = "rollback-triggered"
            break
```

## 四、周期性巡检模式（可选触发场景）

非发版后场景：每月 / 每季度跑一次健康巡检，把窗口设为 24h~7d，采样间隔放大到 1h。结果不衔接回滚，而是追加到 `../../../.speculo/.config/LESSONS.md` 作为持续观察。

## 五、完成准则（机器可验证）

- `grep -c '\[TODO:' monitor.md` = 0
- 文件含 `## 观测窗口` / `## 指标采样` / `## 窗口结论` 三个标题
- "观测窗口" 段含 `start_at` / `end_at` / `interval` / `samples_expected` 四个字段名
- "指标采样" 段含 ≥4 个指标类别（业务/性能/错误/可用 任四类）
- 每个指标类别至少一行采样数据
- "窗口结论" 段含 `pass` / `rollback-triggered` / `inconclusive` 三者之一
- `monitor_window` / `monitor_result` / `rollback_invoked` 写入 `.status.json`
- 若 `monitor_result=rollback-triggered`：`rollback_invoked=true` 且 `current_phase` 已移交 `04-incident`
