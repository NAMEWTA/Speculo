# 实现


本 work 保留模块设计检查、design-it-twice、TDD 红绿循环、双轴审查和证据治理。Ticket 与 Direct Spec 按 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path> 分别决定票据调度、Agent 编排与 change 工作区；同一 change 的实现者复用选定工作区。

若属于未完成父实现，读取 <Path>{roots.workflows}/specdev/common/rules/parent-implementation-orchestration.md</Path> 和父 Map/Plan；继承跨 change dependency/serialization、组合身份、票据上限和整体 Gate，引用成员实际工作区。


## 执行模式

### Ticket 模式（默认）

使用下节规定的输入顺序。父计划提供跨 change Gate 与调度约束，子计划提供本 change 约束，不能相互放宽。无计划时当前 I Lead 按原 Ticket 和 README 执行上下文安排，不要求补造 Goal。

### Direct Spec 模式

完整获批 Spec 可直接实现，先核对范围、各写集 owner、不变量、AC、验证及批准/恢复门。工作区和协作方式分别选择；确需独立调度、DAG、逐票追踪或用户要求时才返回 T。README 替代规格仍限轻量边界。

### Documentation 分支

Ready documentation Ticket 或获批 Direct Spec 需要维护项目文档时读取 <Path>{roots.workflows}/specdev/specdev-i-implement/references/documentation-procedure.md</Path>。继续执行下方全部适用预检、workspace、checkpoint、双轴审查、Evidence 和完成步骤；仅纯说明变更的代码红绿循环由可运行示例/类型/链接/生成与事实验证替代。prompt/tool/CLI/UI 文案属于可见行为，不能按纯说明豁免。

## 输入

两种模式都必须读取：

- 当前规格：存在独立 Spec 时读取它；合同允许的轻量模式读取 README scope/acceptance/verification 等价章节，拒绝双权威。
- 实际执行策略及验证依据；存在 config 时只读取当前分支真实使用的设置，不以缺失 config 阻塞本地工作。

Ticket 模式必须按以下顺序读取：

1. `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>` 的总体实施背景和完整项目 Skill 读取矩阵；
2. 矩阵中适用于 `ALL` 或当前 Ticket ID 的全部项目 Skill；
3. 当前 Ticket `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>`；
4. 存在的 `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`，以及父 Implementation Map 声明当前 change 时的父 Map/Plan。

矩阵是发布时确认的最低必读集合，不是 allowlist。项目 Agent 指令或实际实现范围触发新的项目 Skill 时，先读取该 Skill、停止项目写入，由 Lead 更新 Tickets Map 并重新运行 tickets 校验后恢复。Direct Spec 模式读取同范围直接实现的实际授权、唯一规格与命中的项目 Skill；完整 Spec 的实现不要求补 Ticket/Map/Goal。

按存在情况读取：

- 当前 change 架构决策：`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- 当前 change 领域上下文：`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- 当前 change 设计日志：`<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`
- 当前 change 诊断：`<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>`
- 永久架构决策：`<Path>{roots.state}/specdev/adr/</Path>`
- 永久领域上下文：`<Path>{roots.state}/specdev/context/</Path>`

UI 范围必读 <Path>{roots.workflows}/specdev/common/rules/design-contract.md</Path> 和 <Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path> 的批准版本；Ticket design_ref 与所需页面/AC 一致，Direct Spec 在原规格/Evidence 中保存等价绑定。无 UI 影响时不要求 DESIGN。

永久目录可以为空，静默继续。当前 ADR/CONTEXT 缺失且实施需要对应决定时，返回 `<Path>{roots.workflows}/specdev/specdev-g-grill-with-docs/SKILL.md</Path>`；Spec、Ticket 或 Goal Plan 与代码事实冲突时按 `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>` 返回真正 owner，不在实现中覆盖。

Git 已处于 merge/rebase 冲突时，先加载 `<Path>{roots.workflows}/specdev/specdev-i-implement/references/merge-conflict-protocol.md</Path>`；不把冲突伪装成普通 TDD。

## 流程

### 1. 执行前预检与 workspace

加载 `<Path>{roots.workflows}/specdev/specdev-i-implement/references/execution-preflight.md</Path>`。

预检参考拥有 Ready、依赖证据、真实 Skill、计划版本、owner、权限、Git 状态与 workspace 的完整检查，不在此复写。

通过预检后，复用 change README 中选定的工作区；明确要求创建/恢复 worktree 时以 `purpose=change, operation=create|restore` 调用 <Path>{roots.workflows}/specdev/common/skills/dev-worktree/SKILL.md</Path>。Lead 先保存真实 Execution Context，再将本票设为 in_progress、在原 Evidence 登记 active 执行记录。无票沿 Direct Spec Evidence，不创建票据。

**完成标准**：工作区、基线、owner 与授权符合预检；所有票据复用同一 change workspace，串并行按独立策略决定。

### 2. Lead 决定自行实现或动态派单

按 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path>，用户/项目/当前 Work 要求优先，Lead 根据任务事实和宿主能力安排单 Agent、subagent 或团队。同票协作不改变 serial 票据顺序；跨票并行仍须 DAG 与写集/资源无冲突。只读探索不占票据执行槽。

派单读取 <Path>{roots.references}/coordination/task-brief.md</Path>；外部 CLI/Herdr/Orca 按 <Path>{roots.references}/coordination/session-files.md</Path> 保存冻结 TASK/正式 REPORT 和派遣后可选 session-locator.json；新派遣在投递前与回收时分别运行交接校验的 dispatch/return 阶段，原 Evidence 只导航与验收。Packet 绑定同一 change workspace、票据/规格、实际写集、固定输入、验证与停止条件。多个实现者明确细分写集；Git index 操作由 Lead 协调串行，不暂存他人改动。

**完成标准**：实现者与路径归属可回读，正式状态仍只由 Lead 写入，派遣不创建额外 worktree。

### 3. 设计检查

加载 `<Path>{roots.workflows}/specdev/common/rules/codebase-design.md</Path>`，检查模块、接口、类型、不变量、顺序/错误/性能语义、接缝、适配器、依赖分类、测试观察点和既有公共合同。

存在多个不改变上层契约的局部设计时，可运行 `<Path>{roots.workflows}/specdev/common/rules/design-it-twice.md</Path>`。超出 Ticket 或改变产品/公共合同/数据/兼容/安全时，返回架构审查、Grill、Spec 或 Ticket owner。陌生外部依赖使用 research Skill。

**完成标准**：局部设计与上层契约一致，稳定接缝和依赖策略明确。

UI 的模板、视觉语言、共享组件及交互规则由批准 DESIGN 锁定；局部实现设计不能重新选风格。按页面/状态验收实现并在真实浏览器对照，设计本身无效时返回 P，行为冲突返回 S。

### 4. TDD 红→绿垂直循环

加载 `<Path>{roots.workflows}/specdev/specdev-i-implement/references/tdd-rules.md</Path>`、`<Path>{roots.workflows}/specdev/specdev-i-implement/references/tdd-test-design.md</Path>` 和 `<Path>{roots.workflows}/specdev/common/rules/code-commenting-rule.md</Path>`。纯说明文档按上方 documentation 分支验证；其余对每个验收行为或关键风险：

1. 选择公共接口或稳定接缝；
2. 编写因目标行为缺失而失败的测试/验证并确认失败原因；
3. 只写足以通过当前测试的实现；
4. 运行定向非 E2E 验证；
5. 保存 red/green 事实并进入下一条窄切片。

涉及外部依赖、隔离策略或已有 Mock 时，先读取 `<Path>{roots.workflows}/specdev/specdev-i-implement/references/tdd-mocking.md</Path>`，再决定是否复用真实接缝或替身。

不得删除测试、放宽断言、吞错、永久跳过或只验证 Mock 调用次数来制造绿色。

新增或修改代码注释时，先判断信息能否由命名、类型或结构表达，并同步维护受行为变化影响的既有注释。

涉及错误、取消、并发或资源释放时，按 <Path>{roots.workflows}/specdev/common/rules/error-handling.md</Path> 和 <Path>{roots.workflows}/specdev/common/rules/test-reliability.md</Path> 验证实际状态与清理完成。注册、Worker、CLI、配置和发布路径要覆盖真正入口；删除旧测试前核对全部风险承接，不因为新接口测试存在就删除。

### 5. 实现检查、checkpoint 与 Lead 接收

实现者在选定 change 工作区运行 Ticket/Spec 规定的单元、组件、静态、类型、lint/build 等适用检查，记录命令、退出码、实际改动与未验证项。E2E Gate 留给 Lead。提交只在已有具体授权时执行；没有授权时以工作副本快照冻结实际交付。

Lead 按 <Path>{roots.references}/coordination/result-and-recovery.md</Path> 回读工具、真实 writer、Git/dirty 状态、diff、路径与命令事实。验收前协调相关 writer 停写；无改动且权威事实表明无需实现时 cancelled，不造 empty commit。未完成工作不以 Evidence-only Done 代替。

**完成标准**：实际改动可定位，授权路径及原有用户改动保全；固定 checkpoint 或快照覆盖本票交付。共享工作区其他票的改动不计入本票。

### 6. 双轴审查

调用 `<Path>{roots.workflows}/specdev/common/skills/code-review/SKILL.md</Path>`。required Ticket 以 `base_sha` 与 `source_checkpoint` 为固定点；current Ticket 以 Ticket 实施前基线与 implementation commit 为固定点；Direct Spec 以实施前基线与所选 workspace 最终 checkpoint 为固定点：

- 标准轴：正确性、模块设计、错误、安全、性能、并发、资源、测试与可维护性；
- 规范轴：Spec/Ticket IN/OUT、实现合同、路径所有权、验证矩阵与 Goal Gate；UI 还包括已批准 DESIGN、固定基线和页面/状态规则。

标准轴同时复核 `<Path>{roots.workflows}/specdev/common/rules/code-commenting-rule.md</Path>`：公共 API 契约完整，内部注释只保留非显然的 Why、Invariant 和 Risk，且相关注释与当前行为一致。

默认派遣一位未参与本范围实现的原生 subagent，分别判断标准轴、规范轴并按顺序返回 Lead；明确选择 Herdr/Orca/CLI 时沿该方式派遣。保存真实身份、原始报告和 Lead 工具核验，禁止实现者自审。局部 finding 在当前模式的实现 workspace 修正、创建新 checkpoint 并重跑；改变上层契约则登记 deviation。Ticket 进入 `review` 或 Direct Spec 进入最终验证前，两轴必须通过。

Direct Spec current 未提交时按 <Path>{roots.workflows}/specdev/common/skills/code-review/references/working-tree-review.md</Path> 固定实际交付快照；HEAD 不能代表未提交内容，也不因审查而自动取得 commit 授权。

### 7. 最终验证与适用 E2E

Lead 在同一 change 工作区按 <Path>{roots.workflows}/specdev/common/skills/dev-worktree/references/finalize.md</Path> 核验固定交付、集成/回归和适用 E2E。此方法 current/worktree 均适用，不创建候选 checkout、不自动提交或合并。无提交授权时先按 <Path>{roots.workflows}/specdev/common/skills/code-review/references/working-tree-review.md</Path> 固定工作副本输入。

最终输入变化、冲突修正或多单元组合时，按 <Path>{roots.workflows}/specdev/common/skills/code-review/references/review-evidence.md</Path> 补充整体独立审查；单票记录不能代替全部交付的验收。

同一 blocker 反复出现且无新证据，或 attempts 达到有效上限时，保留当前工作区、checkpoint 和失败历史，将本票 blocked 并返回有效 Lead。Lead 记录共同失败模式、可能原因、下一轮实质改变和 owner/路由后才可重置 attempts。父 Lead 可继续其他不受影响的 Ready 票；不通过新开 worktree 或仅更换 Agent 绕过停止点。

### 8. Evidence、状态与完成

Lead 使用 <Path>{roots.workflows}/specdev/specdev-i-implement/assets/evidence-template.md</Path> 写本票原 Evidence；无票写 evidence/direct-spec.md。执行记录引用 README 唯一工作区，保存实际实现者、固定审查输入、检查、E2E、失败历史及恢复，不复制工作区生命周期或虚构集成链。

UI Evidence 必须包含 `## Design Conformance`，列出 design_ref 的准确 digest、pages 与 acceptance ID，逐项连接实现位置、真实浏览器任务、桌面/窄屏截图和状态观察。对照批准原型说明允许的实现差异；未知与未通过项保持未验证，不能仅凭原型证据完成实施。

Ticket 正常状态：ready → in_progress → review → done。done 要求执行记录 verified、实际改动/AC、独立双轴审查和适用验证通过；无每票 commit/父分支推进要求。blocked/deviated/cancelled 沿原语义，Direct Spec 由原 I owner 按 <Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path> 完成。

按实际存在的负责位置更新：Ticket/Evidence 拥有本票进度，Goal 拥有整体 Gate 与集成，Map/README 只导航；轻量输入把当前清单与验证写原 README，Direct Spec 不创建缺失的 Ticket/Map/Goal Plan。最后一个计划内 Ticket 完成后，Goal Plan 的 Lead 按 change completion 关闭；无 Goal Plan 的当前 I owner 承担同一门禁。需要远程 reconcile 或把已完成 Ticket 投影为 GitHub Issue 时返回 T-triage，否则进入 Archive。

当前 change 属于未完成父实现 change 时，单个组合 Ticket 完成、阻塞或触发 Lead 复盘，且子状态与 Evidence 已写入后，必须自动返回 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/SKILL.md</Path>`，由父 Lead 重读全部成员并决定重新派发、返回上游或继续下一 frontier；不得要求用户逐个重新激活，不得直接归档子 change，也不得从本 Work 实现另一个成员。

运行：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --stage implement \
  --repo <project-root> \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

### 9. 返回

返回 Ticket 状态或 Direct Spec Outcome、原 Evidence、README 工作区引用、真实 checkpoint/快照、E2E、未验证项和下一路由。已授权且实际发生的 Git 交付另列；不把 verified 描述成已提交/已合并。

## 计划型票扩展

实施前按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 执行绑定；恢复或上游变化按 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/replan-and-recovery.md</Path>` 核验。不以读取替代调用，不因他人任务冲突暂停独立已授权工作。
