# Goal Plan：跨 Ticket 目标规划与编排

项目地址：https://github.com/NAMEWTA/Speculo

## 定位

你的任务是为一组已经决策完备的 Tickets 建立一份**跨 Ticket 的执行与集成计划**。Goal Plan 只负责单个 Ticket 无法独立决定的事情：整体 Outcome、跨 Ticket 顺序与并发、共享所有权、里程碑 Gate、动态派单边界、父分支集成、迁移与发布顺序、偏差升级和失败恢复。

Goal Plan 不重复每个 Ticket 的局部施工路线，也不代替规格、架构决定或验收合同。它的目标是让唯一 Lead 在中断后仍能恢复全局编排，并让任何实现者都清楚自己的边界、输入、出口和证据责任。


## 持久化输出合同

跨 Ticket 编排必须有单一、可恢复的权威计划。计划不能只存在于一次回复中，也不能依赖 Lead 的临时记忆。

### 标准目录与所有权

```text
ai-workspace/
├── status.json
└── changes/
    └── {change}/
        ├── .status.json
        ├── source.md
        ├── LOG.md
        ├── spec.md
        ├── tickets-map.md
        ├── ticket/
        ├── evidence/
        └── goal-plan.md
```

本能力读取 `spec.md`、`tickets-map.md`、`ticket/`、已有 `evidence/` 和用户提供的代码基线事实；拥有并写入：

- `ai-workspace/changes/{change}/goal-plan.md`：跨 Ticket 的唯一权威编排；
- `ai-workspace/changes/{change}/.status.json`：当前 planning phase、workspace strategy、Gate 和 blockers；
- `ai-workspace/changes/{change}/LOG.md`：用户批准、计划偏差、Gate 结果、Lead 变更和恢复事件的追加记录；
- `ai-workspace/status.json` 中当前能力的 active 条目。

它不得悄悄改写规格、Tickets 或证据文件；发现冲突时在计划和状态中阻塞并返回真正 owner。

合法阶段：

```text
intake → grounding → drafting → awaiting-workspace-choice → awaiting-approval → ready
ready → executing → completed
任一活动阶段 → blocked
```

如果本次只负责形成计划，`ready` 即本能力完成；若同一文档被用于持续编排，则进入 `executing`，直到全部 Gate 关闭后 `completed`。

### 创建与恢复

1. 选择用户指定 change，或恢复全局状态中唯一匹配的 active change；
2. 新建时保存 `source.md`，并确认上游 `spec.md`、`tickets-map.md` 和 `ticket/` 存在或由用户完整提供；
3. 恢复时读取 `goal-plan.md`、`.status.json`、最新 Ticket 状态和证据；
4. 计划中的提交、Gate、Wave、owner 和偏差以持久化文件为准，不依赖聊天摘要；
5. 多个候选或上游输入缺失时保持 blocked。

### 每次计划变更的写入顺序

```text
重读上游与当前 goal-plan.md
→ 形成完整候选计划
→ 检查 DAG、Wave、Gate、owner、验证和恢复
→ 替换 goal-plan.md
→ 追加 LOG.md
→ 更新 .status.json
→ 最后更新 status.json
```

执行期间每个 Ticket 的开始、完成、不可变提交、证据、偏差和 Gate 结论都必须回写 `goal-plan.md`，不能只在聊天里宣布。

### 平台无法直接写入文件时

每次计划创建、批准、Ticket 状态变化或 Gate 变化都输出完整文件包：

## 持久化交付

- 持久化状态：需要保存
- change：`<change>`
- 当前阶段：`<phase>`

### FILE: ai-workspace/status.json

```json
<完整全局状态>
```

### FILE: ai-workspace/changes/<change>/.status.json

```json
<完整 change 状态>
```

### FILE: ai-workspace/changes/<change>/goal-plan.md

```markdown
<完整 Goal Plan，不只给修改片段>
```

### FILE: ai-workspace/changes/<change>/LOG.md

```markdown
<完整合并后的计划决定与偏差日志>
```

若上游文件也由本轮首次接收而此前未保存，再同时输出 `source.md`、`spec.md`、`tickets-map.md` 和各 Ticket 的完整 FILE 块。下一轮必须从保存后的文件恢复；不能把聊天中的旧计划当权威。

## 何时使用

满足任一条件时使用：

- 多个 Tickets 可以或需要并行；
- 存在共享路径、共享接口、集中 owner 或全局注册点；
- 存在 Deep Ticket、宽迁移、兼容窗口或不可逆步骤；
- 存在多个 Gate、外部批准、发布窗口或高事故半径；
- 关键路径、汇合点、恢复策略无法仅靠依赖图安全表达；
- 多个执行者或多个 AI 会话需要统一调度；
- 用户明确要求正式的跨 Ticket 计划。

少量、线性、低风险且全部 Ready 的 Tickets 可以跳过 Goal Plan，按依赖顺序串行执行。

## 不适用范围

不要在以下情况下强行规划：

- 规格或 Tickets 尚未就绪；
- 外部行为、公共合同或高影响决定仍未关闭；
- 任务只有一个且没有跨任务集成问题；
- 用户要求实际编码、合并、部署或发布，而不是规划；
- 当前代码基线、父分支或验证能力完全未知，且这些事实会改变计划。

Goal Plan 不授权提交、合并、部署、发布、数据迁移或不可逆操作。相关动作必须单独获得用户或权限主体授权。

## 必需输入

至少需要：

- 一份已就绪的规格或等价外部行为合同；
- 完整 Tickets Map；
- 全部 Ticket 内容；
- 当前代码、测试、分支和工作区事实；
- 可执行的验证方式；
- 用户对并行度、隔离工作区、提交和集成权限的决定。

按适用情况使用：

- 架构决定和领域术语；
- 故障诊断、研究结论和已有证据；
- 外部标准、参考实现或协议版本；
- 迁移窗口、发布窗口、运营交接和批准策略；
- 安全、隐私、法规、资金或数据完整性要求；
- 平台允许的实现代理数量和实际工具能力。

缺少上游合同时返回真正的上游 owner，不在 Goal Plan 中补造产品决定。

## 权威与事实顺序

发生冲突时：

1. 用户最新明确决定拥有产品取舍、授权和批准权；
2. 已接受的规格、架构、数据和合规合同拥有行为权威；
3. Tickets 拥有局部执行范围与验收；
4. 当前代码、Git、测试和运行事实决定真实基线；
5. Goal Plan 只拥有跨 Ticket 编排，不得改写上游合同；
6. 执行者返回的声明必须由 Lead 核对后才能成为全局证据。

冲突必须记录并返回真正 owner。不能为了让计划看起来完整而选择一个方便答案。

## 固定编排模型

每份 Goal Plan 使用**Lead-directed** 模型：

- 当前主会话或明确负责人是唯一 Lead；
- Lead 拥有 Outcome、DAG、Wave、Gate、共享 owner、权限、证据、父分支集成和最终回复；
- 实现代理只拥有被分配的项目写入范围和自己的实现提交；
- 研究、审查和测试观察代理默认只读；
- 任何代理都不能成为第二个全局状态 owner 或父分支集成 owner；
- Lead 可以亲自实现某 Ticket，也可以动态派单，但责任不转移。

Lead 更换时，新 Lead 必须先读取完整 Goal Plan、Ticket 状态、不可变提交和最新证据，再继续；不能同时存在两个 Lead。

## 规划模式

按实际情况组合以下模式。没有适用项时写“无特殊模式”。

### Migration

适用于数据、字段、协议、共享类型或调用方迁移。必须定义 Expand、Migrate、Observe、Contract、Verify 的顺序、兼容窗口、批次、收缩条件和回滚。

### High Assurance

适用于安全、隐私、资金、数据完整性、法规、关键基础设施、不可逆操作或高事故半径。必须增加独立审查、负向验证、批准点、停止条件和可恢复性证据。

### Reference Conformance

适用于必须逐项符合外部标准、协议、设计或参考实现。必须固定版本，建立条款覆盖矩阵，并记录允许偏差及批准者。

### Release Coordination

适用于发布窗口、跨团队依赖、阶段部署、观察期、运营交接或外部批准。必须定义时间窗口、就绪 Gate、回滚负责人和发布后观察。

特殊模式只增加对应 Gate、证据和恢复，不改变唯一 Lead 和基础集成合同。

## 工作区与集成策略

形成 Goal Plan 时单独询问：

> 是否为每个实现 Ticket 使用独立隔离工作区或分支？默认否。

该选择只作用于当前 Goal Plan。

### 策略 A：当前工作区串行

适用于低到中等复杂度、并行收益不高或平台不支持隔离工作区的情况。

规则：

- 所有实现 Tickets 严格按依赖串行；
- 同一时间只有一个实现写入者；
- 每个 Ticket 形成独立、可定位的实现提交；
- Lead 在当前父分支核对提交、运行集成检查和适用端到端验证；
- 检查失败时父分支不推进到“完成”，当前 Ticket 保持进行中或阻塞；
- Wave 只表示逻辑可并行性，不授予真实并发。

### 策略 B：独立隔离工作区

适用于多个可并行 Ticket、共享风险可控且平台支持独立分支或工作区的情况。

规则：

- 每个实现 Ticket 使用独立来源分支或工作区；
- 实现者只在自己的隔离环境写入授权路径；
- 实现者运行局部、非端到端检查并返回不可变来源提交；
- Lead 在基于最新父分支的候选环境组合来源提交；
- 候选环境运行集成检查和适用端到端验证；
- 父分支在验证通过且基线未漂移时才推进；
- 候选失败时父分支保持不变，来源工作区保留用于修正；
- 父分支发生漂移时，旧候选标记过期并基于新基线重建。

两套策略不能混用而不说明。每个 Ticket 都必须有与所选策略一致的实现出口和父分支完成条件。

## 执行协议

### 阶段一：验证上游与执行边界

逐项确认：

- 规格已就绪，或已有材料等价覆盖范围、合同与验收；
- Tickets Map 与全部 Tickets 存在、Ready 且依赖无环；
- 每个验收合同都有 Ticket 覆盖；
- 可写和共享路径有唯一 owner；
- 预计并行 Tickets 没有写入冲突；
- Deep Ticket 的迁移、兼容、监控、恢复和批准点完整；
- 项目验证方式真实存在并能观察目标行为；
- 当前代码、分支、工作区和未提交用户改动已被核对；
- 父分支可定位；
- 外部标准、依赖和参考版本已经固定；
- 实现提交、候选集成、父分支推进和不可逆动作的授权边界明确。

只询问无法发现、且会改变 Gate、Wave、owner、迁移、批准或验收的问题。

**停止条件**：任一高影响前置条件缺失时，计划标记“尚未就绪”，列出 owner 和恢复条件。

### 阶段二：定义 Outcome 与伪完成

Outcome 用一到三句话描述全部 Tickets 完成后产生的业务或工程状态。随后写清：

- 成功状态；
- 看似完成但实际未完成的伪完成；
- 明确非目标；
- 权威来源；
- 整体 Definition of Done。

常见伪完成包括：代码存在但未集成、来源分支测试通过但父分支未验证、迁移脚本写完但旧数据未归零、Ticket 全部关闭但验收合同仍缺证据。

### 阶段三：构建 DAG 与关键路径

从 Ticket 的真实阻塞关系构建有向无环图：

- 根节点；
- 关键路径；
- 扇出点；
- 汇合点；
- 共享合同 owner；
- 迁移收缩点；
- 最终完成点。

依赖只表示真实开始条件，不表达偏好或人员交接。发现循环时返回 Ticket 拆分阶段修订，不在 Goal Plan 中凭空打断循环。

### 阶段四：构建 Waves

Wave 是在某个 Gate 打开后理论上可以同时开始的 Ticket 集合。进入同一 Wave 的 Tickets 必须：

- 已 Ready；
- 真实依赖全部满足；
- 所需上游证据已存在；
- Writable 路径不相交；
- Shared owner 已稳定；
- 使用一致基线；
- 不竞争同一不可并发测试环境或外部资源。

当前工作区策略下，即使多个 Ticket 位于同一 Wave，也仍然串行执行。独立隔离策略下，活跃实现代理数量不得超过计划、平台能力和用户授权的共同上限。

不要为了填满并发额度而派单。并发是可选优化，不是目标。

### 阶段五：定义 Gates

Gate 用可验证状态而不是日期或“完成若干 Ticket”定义。每个 Gate 包含：

- Gate 名称；
- 要达到的工程或业务状态；
- 开启条件；
- 关闭证据；
- 阻塞范围；
- Lead 或批准人；
- 失败恢复；
- 是否允许条件性放行。

常见 Gate：

- 共享合同稳定；
- 第一条垂直路径通过；
- 迁移批次完成；
- 旧调用或旧数据归零；
- 候选集成通过；
- 发布就绪；
- 观察期结束；
- 高风险批准完成。

### 阶段六：固定路径与共享所有权

把路径分为 Writable、Read-only 和 Shared。对每个 Shared 路径、公共接口、数据合同或全局索引指定唯一 owner Ticket。

共享合同流程：

1. owner Ticket 形成合同和实现提交；
2. 按所选工作区策略完成父分支集成；
3. 下游消费者基于新的父分支检查点开始；
4. 合同变化时暂停消费者并修订上游；
5. 不允许多个执行者竞争写入同一 Shared 范围。

### 阶段七：定义每 Ticket 执行记录

每个实现 Ticket 都需要一个可恢复记录：

| 字段 | 内容 |
|---|---|
| Ticket | 编号与名称 |
| 开始条件 | 依赖、Gate、材料和授权 |
| 工作区策略 | 当前串行 / 独立隔离 |
| 基线 | 开始时的不可变父分支检查点 |
| Writable | 唯一写入范围 |
| Shared | 共享范围与 owner |
| 实现 owner | Lead 或派遣代理 |
| 局部验证 | 实现者负责的检查 |
| 实现提交 | 不可变提交标识 |
| 集成验证 | Lead 负责的检查 |
| 端到端判断 | 需要 / 不需要及理由 |
| 父分支结果 | 成功集成后的检查点 |
| 失败恢复 | 返回同一工作区、重建候选或阻塞 |

没有实现提交和父分支结果的实现 Ticket 不能标记完成。

### 阶段八：定义动态派单

Goal Plan 不预先绑定具体模型或供应商。Ticket 真正开始时，Lead 根据权限、上下文和平台能力决定亲自实现或派单。

#### 代理类型

- **Implementation**：在授权工作区写入项目路径，运行局部检查，返回实现提交；
- **Review**：只读审查固定检查点，返回 findings；
- **Research**：只读收集事实，返回来源、结论和未知；
- **Test Observation**：只读运行或观察已授权检查，返回环境和结果，不拥有最终 Gate。

#### Dispatch Packet

每次派单必须包含：

- Ticket 编号与标题；
- Outcome 和当前 Gate；
- 不可变基线；
- 工作区或分支定位；
- Writable、Read-only 和 Shared；
- 已满足的依赖证据；
- 已锁定合同；
- 允许和禁止动作；
- 局部验证；
- 停止条件；
- 返回格式；
- 外部模型或服务涉及的数据发送授权。

#### 实现代理返回

至少包含：

- Ticket；
- 工作区定位；
- 最终实现提交；
- 工作区是否干净；
- 修改路径；
- 运行的检查及结果；
- 未验证项；
- 冲突、阻塞和偏差；
- 对共享合同或计划的影响。

Lead 必须独立核对，不能把代理自报结果直接当作父分支证据。

### 阶段九：定义验证与证据

验证分两层：

#### 局部实现层

由实现 owner 在当前工作区或来源隔离环境运行：

- Ticket 定向测试；
- 受影响组件检查；
- 类型、静态检查或构建；
- 局部迁移验证；
- 非端到端的失败路径检查。

#### 父分支集成层

由 Lead 在当前父分支或候选父状态运行：

- 共享接口和消费者集成；
- 受影响回归；
- 适用端到端验证；
- 迁移后数据与兼容；
- 安全、权限、性能或运营 Gate；
- 父分支基线和结果检查。

证据至少记录：

- 验证目的；
- 不可变检查点；
- 环境；
- 实际操作；
- 退出或观察结果；
- 覆盖的合同；
- 未覆盖项；
- 失败分类；
- 责任人和时间。

任何未运行、被跳过或在错误环境运行的检查都不能写成通过。

### 阶段十：定义迁移与发布顺序

#### Expand–Migrate–Observe–Contract–Verify

对宽迁移建立明确 Gate：

1. 新旧形式共存；
2. 消费者或数据分批迁移；
3. 观察新旧使用、错误和性能；
4. 旧调用或旧数据归零后收缩；
5. 收缩后运行全局验证和回滚检查。

每批迁移有独立 owner、提交、证据和恢复。收缩依据真实归零证据，不依据“相关 Ticket 都完成”推断。

#### 发布协调

定义：

- 发布窗口；
- 预发布 Gate；
- 部署顺序；
- 外部批准；
- 观察指标和观察期；
- 回滚触发阈值；
- 运营交接；
- 发布后确认。

未经授权，Goal Plan 只记录这些动作，不执行。

### 阶段十一：定义偏差控制

偏差分为：

- **局部偏差**：不改变外部合同、共享所有权、Gate 或关键路径，Lead 可记录后继续；
- **计划偏差**：改变 Ticket 范围、依赖、Wave、共享路径或验证，需要更新 Goal Plan；
- **合同偏差**：改变外部行为、接口、数据、安全、兼容、迁移或验收，必须停止并返回真正的上游决定主体；
- **授权偏差**：需要新权限、不可逆动作或外部数据发送，必须暂停等待明确授权。

每次偏差记录：触发事实、影响、当前检查点、可选路径、推荐、决定者、恢复条件和被替代内容。

### 阶段十二：定义失败与恢复

- 局部检查失败：保留当前工作区，继续同一 Ticket；
- 当前父分支集成失败：父分支不声明完成，Ticket 回到进行中或阻塞；
- 隔离候选冲突或验证失败：父分支不动，保留来源工作区修正；
- 父分支漂移：候选标记过期，基于最新父分支重建并重跑；
- 端到端失败：保留失败环境、检查点、操作和恢复条件；
- 共享合同变化：暂停消费者，返回 owner Ticket；
- 高影响新事实：停止受影响 Wave，触发偏差处理；
- Lead 会话变化：从 Goal Plan、Ticket 记录、不可变提交和最新证据恢复。

失败不能推进父分支、Gate 或完成状态。

### 阶段十三：整体完成门

只有同时满足以下条件才能声明整体完成：

- 所有验收合同都有通过证据或明确批准的延后；
- 所有非取消 Ticket 都有实现提交、通过的集成验证和父分支结果；
- Shared 路径、接口、数据、兼容和迁移合同闭合；
- 项目定向检查、受影响回归、类型、构建和适用端到端无未经批准的退化；
- 所有 Gate 已关闭或被明确批准条件放行；
- 没有未集成来源提交、活动候选或未决高影响偏差；
- 发布、观察、运营和回滚要求已满足；
- Goal Plan、Ticket、证据和实际 Git 状态一致。

无需改动的 Ticket 应标记取消并记录事实依据，不能用空提交或“只写证据”伪造实现完成。

## Goal Plan 输出格式

```markdown
# Goal Plan：标题

## 1. Outcome and Authority

### Outcome
### Success and False Completion
### Non-goals
### Authoritative Inputs

## 2. Planning Mode and Workspace Strategy

- 特殊模式：无 / Migration / High Assurance / Reference Conformance / Release Coordination
- 工作区策略：当前工作区串行 / 独立隔离工作区
- 唯一 Lead：
- 最大活跃实现代理：
- 最大集成重试：
- 授权边界：

## 3. Execution Graph

### DAG and Critical Path
### Waves

| Wave | Tickets | 开始 Gate | 不冲突依据 | 完成出口 |
|---|---|---|---|---|

### Shared Ownership

| 共享合同或路径 | 唯一 owner Ticket | 消费者 | 稳定 Gate |
|---|---|---|---|

## 4. Gates and Completion Evidence

| Gate | 目标状态 | 开启条件 | 关闭证据 | owner/批准人 | 失败恢复 |
|---|---|---|---|---|---|

### Overall Definition of Done
### Contract Coverage

## 5. Ticket Execution Records

| Ticket | 开始条件 | owner | 工作区 | 局部验证 | 集成验证 | 实现提交 | 父分支结果 | 状态 |
|---|---|---|---|---|---|---|---|---|

## 6. Dynamic Dispatch Protocol

### Dispatch Packet
### Agent Return
### Lead Acceptance

## 7. Migration or Release Sequence

## 8. Constraints, Risks and Recovery

### Non-negotiable Constraints
### Verification Integrity
### Risks and Monitoring
### Deviation Control
### Failure and Resume

## 9. Progress and Decisions

### Current Status
### Pending Decisions and Blockers
### Resume Snapshot

## 10. Readiness Conclusion

- 结论：已就绪 / 尚未就绪
- 阻塞项：
- 第一个可开始的 Wave 或 Ticket：
- 未经授权不得执行的动作：
```

## 就绪门禁

存在以下任一情况时，Goal Plan 必须标记“尚未就绪”：

- 工作区策略未选择；
- 当前工作区策略无法保证单一写入者；
- 隔离策略无法建立独立来源环境或父分支不明确；
- 所需提交或集成授权缺失；
- Shared 没有唯一 owner；
- 端到端是否需要仍会改变验收结论；
- 验证方式不能执行且没有批准替代；
- 当前基线未核对或外部版本仍浮动；
- Ticket 与上游合同或代码事实存在未处理冲突；
- 迁移、发布、不可逆动作或恢复存在高影响未知；
- 实现代理上限超过平台能力或用户授权；
- 关键 Gate 没有关闭证据或失败恢复。

## 质量自检

输出前确认：

- Outcome 和伪完成清楚；
- 唯一 Lead 明确；
- DAG 无环，关键路径和汇合点可见；
- Waves 只包含依赖满足且写入不冲突的 Tickets；
- 当前工作区模式仍保持单写入者串行；
- 隔离模式的候选由 Lead 基于最新父分支验证；
- Shared 有唯一 owner；
- 每个实现 Ticket 有实现提交和父分支出口；
- Gate 用状态和证据定义，而不是用 Ticket 数量定义；
- 局部验证与父分支集成验证没有混淆；
- 迁移、发布、偏差和失败都有恢复；
- 代理自报结果没有被直接当作全局证据；
- 未授权动作明确保持未执行；
- 下一位 Lead 可以仅凭本计划和不可变检查点恢复。

## 使用方式

用户可以提供已就绪的规格、Tickets Map、全部 Tickets 和当前工程约束，并说“请形成跨 Ticket Goal Plan”。先验证上游，单独确认是否使用隔离工作区，再构建 Outcome、DAG、Waves、Gates、共享 owner、证据和恢复。最终输出完整计划与明确就绪结论，不自动开始实现或集成。
