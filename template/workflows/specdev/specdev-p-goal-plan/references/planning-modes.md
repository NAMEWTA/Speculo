# Goal Plan 规划模式与输入门禁

规划模式描述 Goal 额外解决的工程问题；票据调度、Agent 编排与 change 工作区独立，默认 auto 和复用 current。

本文件定义单 change 的规划与全局执行门。多 change 父编排创建仍要求成员全员 Ready，遵守 `<Path>{roots.workflows}/specdev/common/rules/parent-implementation-orchestration.md</Path>`。

## 1. 输入门禁

开始规划前穷尽检查：

- Spec `ready_for_tickets: true`，或上游工件已等价覆盖范围、合同与验收；
- Tickets Map 与全部计划内 Ticket 存在，范围、合同覆盖、DAG 和所有权完整，DAG 无环；Map Ready 表示结构就绪，不要求所有未来 Ticket 同时 Ready；
- 等待真实上游产物的未来 Ticket 保持 `status: draft`、`ready: false`，在未决问题中记录缺口、生产者 Ticket、所需证据和 DoR 重审条件；不编造版本、路径或验证入口；
- 每个验收合同被 Ticket 覆盖；
- writable/shared path 有唯一 owner，Wave 候选无写冲突；
- Execution Policy Source 记录票据调度、明确的票数/人数限制与验证尝试上限；已有 config schema v7 按原义核对，不补建配置；
- 选定工作区与原授权可定位；commit/merge 仅明确承诺时另行核对，plan 可列待批准项并保持未就绪；
- 待执行 Deep Ticket 的迁移、兼容、监控、恢复和不可逆批准点完整。
- Ticket 与 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`、`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`、`<Path>{roots.state}/specdev/adr/</Path>`、`<Path>{roots.state}/specdev/context/</Path>` 和当前代码事实不存在未处理冲突；
- 项目声明的验证命令真实存在，并能观察目标行为；不可运行项有替代证据或明确 blocker；
- 当前源码基线、父分支、工作区状态和现有用户改动已经实测；
- 外部合同、标准、参考实现或依赖版本已经固定，不使用浮动的“最新”描述。

影响整体范围、DAG、合同覆盖或所有权的上游事实缺失时返回其 owner。已定位到未来 Ticket 的局部缺口只阻塞该票及其依赖闭包，不阻塞独立 Ready 生产者。非 v8 Goal Plan 必须按当前合同重新规划，不能只修改版本号。

## 2. 可组合模式

- `migration`：存在 expand-contract、数据/协议迁移、兼容窗口或收缩条件；
- `high-assurance`：涉及安全、隐私、资金、数据完整性、法规、关键基础设施、不可逆操作或高事故半径；
- `reference-conformance`：必须逐项符合外部标准、协议、设计或参考实现；
- `release-coordination`：存在发布窗口、跨团队依赖、外部批准、阶段部署、观察期、运营交接或远程 reconcile。

没有适用模式时 `modes: []`。模式只增加对应 Gate、证据和恢复，不改变 Lead、worktree 或集成基本合同。

## 3. 独立执行选择

按 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path> 分别记录票据调度、Agent 编排与工作区。默认 ticket_execution:auto，工作区复用 current；用户明确要求才为 change 创建一个 worktree。所有票据与协作者复用它，不询问默认选项，不从串并行派生工作区。

## 4. Ready 停止条件

Goal 全局执行门与 Ticket DoR 分开判断。以下任一全局条件未满足时 `ready_for_execution: false`；局部 Ticket 的缺口、资源冲突或未通过 DoR 由逐票检查阻塞对应依赖闭包，不升级成全员停止：

- Goal Plan 工作区选择未记录；
- 所选调度存在未解决的依赖、路径或语义资源冲突；
- 用户选择的 change 工作区无法创建/复用或与实际 Git 冲突；
- 实现或明确要求的额外 Git/不可逆动作缺少具体授权；
- shared path 没有唯一 owner；
- E2E 是否需要会改变验收结论但尚未确定；
- 整体目标的验证命令不能执行或无法观察目标行为，且没有批准的替代证据；
- 当前源码/工作区基线未实测，或外部合同版本仍然浮动；
- 影响整体目标的 Ticket 与 Spec、ADR、`<Path>{roots.state}/specdev/adr/</Path>`、`<Path>{roots.state}/specdev/context/</Path>` 或代码事实冲突未处理；
- 整体迁移、发布、不可逆动作或恢复存在高影响未知项；
- 实现或 integration attempt 上限无真实来源，或超过实际存在的 config 或平台能力。

全局门通过后仍只调度自身 Ready、依赖成功完成、owner 明确且资源/并发条件满足的 Ticket。上游 done 不自动修改消费者 Ready；Lead 回读真实产物，按 `<Path>{roots.workflows}/specdev/specdev-t-tickets/references/ticket-readiness.md</Path>` 重审后才能更新该票。frontier 为空且仍有未完成票时报告精确缺口与重审条件。

## 5. 执行字段

- orchestration: lead-directed 只固定正式状态与验收 owner；
- ticket_execution: auto | serial | parallel，默认 auto；
- max_parallel_tickets 为可选正整数，计同时 in_progress/review 的票；
- concurrent_implementation_limit 仅在明确要求时记录，计实际实现者，包括参与实现的 Lead；
- integration_attempt_limit 为检查失败后的复盘上限，来源可回读，已有 config 更严格上限继续适用；
- README Execution Context 唯一记录 change 工作区，计划只导航；
- provider/模型/具体协作在执行期按用户、项目、Work 和宿主能力决定，不固定 Agent 拓扑。

**完成标准**：调度、工作区、实际约束、权限和 Lead 可恢复，没有用人数、票数或工作区数互相推导。

## 按风险选择 Gate

兼容、迁移、恢复、性能和用户/模型可见行为仅按真实影响设置 Gate。Gate 说明不可替代的证据、执行环境与失效条件；不要要求所有未来票同时 Ready，也不让局部字段通过替代全局执行授权。
