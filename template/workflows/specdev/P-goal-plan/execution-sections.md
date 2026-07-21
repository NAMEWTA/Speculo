# 执行章节 §4-5 编写规程

编写 goal-plan 的 Ticket DAG 和单 ticket 执行协议。这两个章节是 goal-plan 的核心工程内容，决定"按什么顺序做"和"每个怎么做"。

## §4 — Ticket DAG and Scheduling Order

tickets-map.md 的格式遵循权威模板 `<Path>{roots.workflows}/specdev/T-tickets/tickets-map-template.md</Path>`——执行清单为六列表格（编号 | Ticket | 被阻塞于 | Gate | Contract ID | 状态），依赖关系节支持门禁标注 DAG。

### DAG 构造

从 tickets-map.md 读取并丰富依赖图：

1. **读取 tickets-map.md** —— 读取执行清单表的 `被阻塞于` 列和基础 ASCII 依赖树
2. **构建邻接表** —— ticket A 阻塞 ticket B = A → B 的有向边
3. **检测循环** —— 如果有循环依赖，报告并停止，让用户先修复 tickets
4. **标注门禁层级** —— 结合合同或 spec 的优先级（P0/P1/P2）给每个 ticket 分配 gate 层级，将 Gate 标注**回写**到 tickets-map.md 执行清单表的 Gate 列：
   - P0 = 阻塞所有后续工作的核心基础设施
   - P1 = 主要功能切片
   - P2 = 增强和边界情况
5. **填写 Contract ID** —— 如激活合同模式，将每个 ticket 覆盖的验收条目 ID 回写到 tickets-map.md 执行清单表的 Contract ID 列

### 门禁次序

P0 门禁先开，阻塞所有 P1/P2 关闭。ticket 可以在其依赖就绪后开始，不依赖门禁——但门禁关闭（和里程碑推进）严格遵循 P0→P1→P2 顺序。

### ASCII 图绘制

在 tickets-map.md 的「依赖关系」节中，将 T-tickets 写入的基础 ASCII 树形图**丰富**为门禁标注 DAG。遵循以下约定：

- 每行一个 ticket，缩进表示依赖深度
- `→` 表示依赖关系（A → B 表示 B 依赖 A）
- 用注释标注门禁边界：`--- P0 gate ---`
- 可立即开始的 ticket 标注 `[READY]`
- 扇出点标注 `[FAN-OUT: N路并行]`

示例格式：
```
#4 [READY]  →  #5 [FAN-OUT: 3路并行]
                     ├→ #6 [P0]
                     ├→ #7 [P1]
                     └→ #8 [P1]
--- P0 gate ---
#6  →  #9 [P1]  →  #10 [P2]
```

将丰富后的 DAG 回写到 tickets-map.md 的「依赖关系」节，替换 T-tickets 写入的基础版本。

### 并行规则

tickets-map.md 的「并行规则」节已由模板预设默认值（最大 3 并发、allowlist 不重叠、共享文件仅 Lead 修改）。P-goal-plan 根据实际 ticket 数量调整并发数（> 20 时可调至 4），并在 goal-plan.md §4 中引用 tickets-map.md 的并行规则（避免重复）。

### 草拟与确认

输出 DAG 图、门禁次序声明、并行规则。等待用户确认后，将门禁标注和 Contract ID 回写到 tickets-map.md，将完整 DAG 和门禁次序写入 goal-plan.md §4。

## §5 — Per-Ticket Execution Protocol

### 协议定制

根据 input-validation.md 检测到的执行模型选择协议骨架：

#### Lead+Subagent 模型（完整八步）

1. **读取** —— Lead 读取 issue 全文、合同/参考权威对应行、ticket 的验收标准。如果激活参考权威模式，对照参考快照中的对应交互路径。
2. **派单** —— Lead 输出结构化派单行 `IMPLEMENTER_DISPATCH #<n> issue=<url> gate=<P0|P1|P2> allowlist=<files> contract_ids=<...>`，然后生成实现子代理（model: fable, 唯一 name）。Lead+Subagent 模型下，加载 `<Path>{roots.workflows}/specdev/P-goal-plan/lead-orchestration-protocol.md</Path>` 获取完整的编排协议——包括子代理上下文载荷结构、handoff 交接、合并冲突解决、Worktree 隔离和收尾审查的详细步骤。
3. **实现** —— 子代理在 file allowlist 内实现变更，按 ticket 指定的测试矩阵运行测试。
4. **双轴审查** —— 实现完成后，立即启动两个审查子代理并行运行：
   - `reviewer-standards-<n>`：代码质量、架构、测试覆盖
   - `reviewer-spec-<n>`：spec 合规、验收标准
   - 任一返回 REQUEST_CHANGES 则启动修复子代理
5. **门禁** —— 类型检查、测试、lint 全部通过。
6. **回写** —— 如果激活合同模式：更新合同条目状态为 `done` 或 `deviate`；如激活 ADR 模式：检查 ADR 状态无需变更。偏差条目如有则由 Lead 同步偏差表。
7. **关闭 issue** —— 附上验证证据（测试输出、commit SHA、如适用附截图）。
8. **Lead 纪律** —— Lead 自身不得实现代码。如果 Lead 发现自己在写实现代码，输出 `DELEGATION_VIOLATION` 并重新派单。子代理不得操作 Git——只由 Lead 提交。

#### 简化模型（精简协议）

1. **读取** — 读 ticket、spec 对应 User Story、验收标准。
2. **实现** — 在 ticket 声明的范围内实现变更。
3. **审查** — 单审查者检查代码质量和 spec 合规。
4. **门禁** — 类型检查、测试通过。
5. **关闭** — 提交并关闭 issue。

### 草拟规则

- 协议步骤中的具体路径（合同路径、参考快照路径）从 input-validation 的检测结果填入
- 测试矩阵从 tickets 或 spec 的 Test Decisions 提取
- 双轴审查的派单模板写为可复制的文本块
- Lead 纪律写为不可协商的约束

### 草拟与确认

输出 §5 完整协议文本。等待用户确认后进入治理章节。

**完成标准**：§4 DAG 图无循环、门禁标注正确、对照表完整且经用户确认；§5 执行协议八步/精简流程已定制填入具体路径、测试矩阵和双轴审查模板，经用户确认。

## 子文件引用

本文件按需加载以下子文件：

| 文件 | 内容 | 触发条件 |
|------|------|----------|
| `<Path>{roots.workflows}/specdev/P-goal-plan/lead-orchestration-protocol.md</Path>` | Lead 编排协议——派单上下文载荷、handoff 交接、合并冲突解决、Worktree 隔离的创建与收尾、里程碑收尾审查 | 使用 Lead+Subagent 模型时，在 §5 步骤 2「派单」加载，覆盖从派单到收尾的完整执行生命周期 |
