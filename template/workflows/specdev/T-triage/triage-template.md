# Triage: <标题>

- **Change：** `<change>`
- **来源工件：** `<Path>{roots.state}/specdev/changes/{change}/source-issue.md</Path>` / 外部输入
- **类型：** bug / feature / refactor / investigation / operations / documentation
- **影响：** 用户、系统、数据或交付影响
- **风险：** low / medium / high / critical
- **紧急度：** immediate / scheduled / normal / unknown
- **当前证据：** 已观察事实，不写推测
- **相关代码/工件：** `<Path>src/example.ts</Path>` / `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>` / 无
- **缺失的可发现事实：** 无 / 可通过仓库、日志、测试或配置查明的事实
- **需要用户决定：** 无 / 只有无法从环境推导且会改变目标、范围或风险承受度的决定
- **推荐下一 work：** D-diagnose-bugs / G-grill-with-docs / S-spec / W-wayfinder / I-implement / R-review-architecture / A-archive-and-consolidate
- **推荐理由：** 为什么该 work 是最小且正确的下一步
- **ready_for_implementation：** false

## 路由判定

- **Bug 但根因未知：** 进入 D-diagnose-bugs。
- **需求或设计存在关键未知：** 进入 G-grill-with-docs。
- **意图清晰但尚无可验收 Spec：** 进入 S-spec。
- **需要并行调查多个未知：** 进入 W-wayfinder。
- **已具备 Ready Ticket，或满足受控 Direct Spec：** 进入 I-implement。
- **目标是结构健康评估而非立即修复：** 进入 R-review-architecture。
- **目标是关闭、合并或沉淀 change：** 进入 A-archive-and-consolidate。

## 输出

将结果写入 `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`，并同步 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 的下一阶段和阻塞状态。
