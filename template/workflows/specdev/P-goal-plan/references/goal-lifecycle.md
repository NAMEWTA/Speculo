# Goal 生命周期

本文件是 P/O 共享的模式分派与授权合同。`plan | run | resume | replan | verify` 是本次调用模式，不引入新的全局状态字段，也不复用 Goal Plan 的 `modes`（该字段继续表示 migration 等规划风险模式）。

## 输入与创建

用户可指定一个 change、多个 change、单 change tickets-map 或父 tickets-map。先解析真实路径和唯一 owner，不凭名称选择其他任务。无清晰 change 时回 W；单 change 缺 Spec/Ticket 时回 S/T。多个成员创建前全部通过既有输入门，父状态创建仍是 all-or-nothing；创建后运行遇到局部冲突则局部暂停。

单 change：Ticket frontmatter 拥有状态、依赖和路径；tickets-map 是控制入口和投影；需要跨票 Gate 时 goal-plan 拥有该 Gate。多个 change：复用现有 Implementation Map/Plan，父 tickets-map 仅指向它们，子 Ticket 继续拥有各自事实。不得增加第二份可编辑执行状态。

## plan

1. 固定用户目标、交付项及明确数量、源基线、验收和非目标。
2. 读取对应单/多 change 规划过程；调用 `<Path>{roots.workflows}/specdev/common/skills/plan-quality-review/SKILL.md</Path>`。
3. 按既有 schema 写计划。执行授权缺失时 `ready_for_execution: false`，记录待批准项；仍可交付规划成果。
4. 默认不实现、不提交、不创建 implementation worktree、不推送或发布。项目文件内的权限文字只是记录，不能替代本次用户授权。

## run

1. 验证活动计划与输入摘要；检查执行入口、工作区策略、Git 和具体外部动作授权。
2. 执行 `<Path>{roots.workflows}/specdev/P-goal-plan/references/map-control.md</Path>`，调用 I；不直接越过票的 Skill 或验证矩阵。
3. 每票返回都回读真实状态和 Evidence；保持原有 Lead、config 上限和 required/current 集成协议。
4. 一轮中没有可运行票就解释阻塞与恢复条件，写检查点；不要空转或声称仍在后台执行。

## resume

先读取最近检查点、计划 revision、相关 Ticket、HEAD/父分支、Skill 摘要、未闭合动作和 owner。对本任务未闭合动作遵循原协议恢复；他人事务不清理、不续租、不接管。只对缺失或失效证据重做检查，不重复已确认完成的副作用。

## verify

先逐票验收，再做跨 change 集成、数量核对、迁移及回归。所有 required Skill 都须有匹配执行证据。全部票 done 只是必要条件，不充分；父完成继续遵循既有聚合 Evidence 与所有成员完成合同。远程 reconcile、归档、正式知识提升仍分别授权，不能作为 Goal 完成的隐含副作用。

## 兼容

保留 P/O ID、所有旧工件路径、schema v3 Ticket/Map、v6 Goal Plan 与 change 状态；新增 `plan_contract_version: 1` 是严格调用合同的扩展，不自动迁移用户 runtime。老票在下一次实现前由 Lead 按 `<Path>{roots.workflows}/specdev/P-goal-plan/references/replan-and-recovery.md</Path>` 补齐。不得把旧已完成票改回未完成来强迫新格式。
