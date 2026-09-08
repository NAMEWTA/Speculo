---
schema_version: 1
artifact: goal-tickets-map
change: <YYYY-MM-DD-goal>
implementation_map: "<Path>{roots.state}/specdev/changes/{change}/implementation-map.md</Path>"
implementation_plan: "<Path>{roots.state}/specdev/changes/{change}/implementation-plan.md</Path>"
---

# Goal 总控入口

本文件由统一 Goal 创建父实现 change 时生成，只负责入口解析，不缓存成员、依赖、owner、状态或 Gate。

从这里读取上方 Implementation Map/Plan，再进入 `<Path>{roots.workflows}/specdev/P-goal-plan/P-goal-plan.md</Path>` 的 `run` 或 `resume`。先运行 `<Path>{roots.workflows}/specdev/common/tools/ticket-control.mjs</Path>` 的 `--map` 只读检查；实际执行、授权和完成仍走 P/I 原协议。

现有父 change 可以在恢复时由其唯一 Lead 补建此入口，不移动旧工件。仅计划调用不得启动实现。
