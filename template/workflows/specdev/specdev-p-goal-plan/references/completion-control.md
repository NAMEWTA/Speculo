# Goal Plan 完成、证据与恢复

## 1. 整体 Definition of Done

实现型完成按 <Path>{roots.workflows}/specdev/common/skills/code-review/references/review-evidence.md</Path> 保留覆盖实际最终交付的风险适配审查证据。standards/specification 是检查内容，不固定执行者：低风险允许主 Agent 自查，高风险或用户/项目明确要求时必须有真实独立 reviewer、冻结输入与可回读结果。多单元组合按整体影响确定审查；单单元固定输入相同可复用，未提交内容使用工作副本快照。非实现学习、复盘及取消沿各自等价验收，不制造代码审查。


至少要求：

- Spec 验收合同全部有通过 Evidence 或明确批准的 deferred；
- 非 cancelled Ticket 有真实改动、verified 执行记录、风险适配的双轴检查（不适用项说明依据）、AC 和适用验证；commit 或工作副本快照都可固定交付；
- shared path、接口、数据、兼容、迁移、调用点与回滚合同闭合；
- 项目定向检查、受影响回归、类型检查、lint/build 和适用 E2E 无未经批准退化；
- README Outcome、Ticket、Map 导航、Goal Plan、Evidence 与实际 Git 状态一致；
- 无活动 writer、未验证交付或未决高影响偏差；明确承诺的 Git/外部交付按约定完成或获明确处置。

无需改动的 Ticket 必须转为 `cancelled` 并记录来源事实；不得用 Evidence-only Done 或 empty commit 关闭。

## 2. 单票与整体验证

按 <Path>{roots.workflows}/specdev/common/rules/evidence-and-verification.md</Path> 在选定 change-workspace 验证。实现者运行适用检查，Lead 在固定输入上核验集成/回归和适用 E2E；需要独立 reviewer 时按原合同核验其身份并审查。记录真实命令环境，不以执行者自报代替 Lead 验收。整体输入覆盖全部票据，不只最后一票。

## 3. Gate 关闭

Lead 在每个 Gate 汇总覆盖 Evidence、接口/数据/兼容状态、固定 checkpoint/快照、适用 E2E、反向验证、偏差、风险和批准。Gate 不以“完成若干 Ticket”作为唯一关闭条件。

## 4. 失败与恢复

- 单票检查失败：保留选定 change 工作区与快照，修复受影响票；
- 工作区共享资源或 Git 冲突：停止冲突写入，由 owner 处置，保留当前事实；
- 固定输入漂移：使受影响证据失效，重新冻结并验证；不新建工作区；
- required E2E 失败：不能 verified/done，保留失败命令、快照和恢复条件；
- 同一 blocker 反复出现、下一轮没有新证据，或 integration attempts 达到有效上限：停止自动重复，保留 workspace、checkpoint 和全部失败事实，将受影响 Ticket 标为 `blocked` 并返回有效 Lead；Lead 按 lead-orchestration 在 Evidence 写复盘决定后，才可重置该 Ticket 的 `attempts` 并以有实质变化、可回读的新执行输入接续（需要持久委派时创建新 Packet），不得重复原结果未知或仍在写入的操作；
- 命中当次 Dispatch Packet/候选协议的停止条件、继续修正已无合理收益或需要新产品决定：停止受影响 Wave，按 deviation control 返回契约 owner；
- Lead 会话变化：读取 Goal Plan、Ticket、change 选定工作区状态与最新 Evidence，从最后不可变 checkpoint 恢复。

父 P-goal-plan 的 Lead 可继续其他不受影响的 eligible 节点，并按 conflicts、资源与配额选择合法组合；单个 Ticket 进入 Lead 复盘不自动终止整个父循环。

## 5. Change 完成 owner

Lead 是 Goal Plan change 的唯一完成 owner。没有 Goal Plan 的单 Ticket/Direct Spec 由当前 I-implement owner 按 change completion 规则完成。Archive 不补造完成证据。

**完成标准**：所有通过、阻塞、取消和未验证声明均定位到权威工件、命令与 Git checkpoint；失败不能推进 verified 或 Done。

## 完成声明的版本

关闭前核对最终实际代码/配置/构件与证据版本，说明未运行项、行为差异和残余风险。性能微基准、原型或 mock 不替代明确要求的真实路径。PR/Issue/发布分别回读原账本，远程 pending 不伪装已交付。
