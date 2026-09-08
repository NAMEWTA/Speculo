# Initiative：从大需求到独立 Change

## 结构与所有权

探索载体是现有 change 目录；W 在其中拥有 `<Path>{roots.state}/specdev/changes/{change}/initiative.json</Path>` 与 wayfinder 地图/调查票。`<Path>{roots.state}/specdev/changes/{change}/initiative.json</Path>` 只记录候选边界、关系和 materialized target，不缓存子 change 的状态、Spec、设计树或票正文。

候选 `id` 是稳定 kebab 标识，`target` 为 null 或实际 sibling change 名；同一个 target 不能重复，也不能指向探索载体本身或父 implementation change。其他任务的现存 change 只能在核验归属并获得明确关联授权后引用，不接管其工作。

## 探索顺序

1. 命名大目标、用户指定数量和排除项；按行为、领域边界、风险、接口与发布独立性广度扫描。
2. 能描述边界的部分成为候选 change；不能描述的留在迷雾。候选至少写背景、目标、非目标和未知项，不预造实施步骤。
3. 在探索地图建立共享调查问题；每个问题仍遵循 research/prototype/grilling/task、HITL/AFK 和每会话一个调查票的原纪律。
4. 用户接受候选边界后，创建或明确关联 target change。共享答案以 solution comment/source 引用导入，不复制成新的永久知识。
5. 对每个 target 调用 `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>`；该 target 独立拥有 design-tree、LOG、CONTEXT、ADR。已确认共享决定可引用复用，不能要求用户机械回答同一问题。
6. 单个 target 的关键决定清晰后分别进入 S/T；无关 target 继续探索。一个 target 的 blocker 不应阻塞其独立 sibling。

## 校验与交接门禁

- 候选 DAG 无环，依赖 ID 存在；目标与来源有证据，未创建 target 的候选不宣称 Ready。
- `--stage wayfinder` 验证 initiative 结构、目标存在性与禁止自引用；它不等于子 change 已就绪。
- 交接时对**选定** target 分别执行 `--stage grill` 与 `--stage tickets --repo <project-root>`，检查设计树 consensus、Spec `ready_for_tickets`、所有待执行票 Ready。
- 选定范围的跨 change 依赖须同时选择或有已完成基线证据，不用未完成/已取消票虚假满足依赖。
- 一个 target 交给 P 的单 change 分支；两个或以上 Ready target 交给 P 的多 change 分支。P 不接手剩余迷雾，也不为这些未知部分伪造计划。
- 用户明确要求全部 change 时，报告全部候选与各自阻塞；交接已清晰部分不等于少交付其他部分或宣布整个大需求完成。

## 版本与恢复

变更候选边界或依赖时递增 `revision`，在探索 LOG 记录来源和替代关系。原 claim、评论编号和低分辨率地图仍是原协议；不改写其他任务，不把探索载体迁成父实现 change。两者可以关联，但职责和 owner 分开。
