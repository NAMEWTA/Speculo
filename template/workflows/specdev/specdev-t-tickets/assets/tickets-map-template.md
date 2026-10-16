---
schema_version: 3
plan_contract_version: 1
plan_revision: 1
requested_deliverables: []
deliverable_policy: unreviewed
artifact: tickets-map
change: <YYYY-MM-DD-topic>
status: draft
---

# Tickets Map: <工作名称>

- **Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **Ticket 目录：** `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`
- **Evidence 目录：** `<Path>{roots.state}/specdev/changes/{change}/evidence/</Path>`
- **可选 Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`

## 1. 目标与拆分策略

**执行入口：** 获得实现授权后，Lead 与实现执行者读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`，再按当前输入实际调用适用项目 Skill。I 负责实现、独立双轴审查、验证与 Evidence；计划本身不授予实现或 Git 操作权限。

引用主要用户故事、验收合同和架构决策，说明所有 Ticket 共同交付的目标、切片原则、prefactor 和 expand-contract 选择。不要复制整个 Spec。

### 总体实施背景

记录所有 Ticket 共同依赖、但不属于单个 Ticket 的模块边界、公共契约、关键不变量、集成顺序和不可重复决定。实现者用本节理解全局目标；单 Ticket 的完整实现契约仍由对应 Ticket 拥有。

### 项目 Skill 读取矩阵

每个 Ticket 的 Lead 或 实现执行者 都必须先完整读取本 Map，再读取候选项目 Skill 的 frontmatter 与入口；只有适用于 `ALL` 或当前 Ticket ID、且 scope/路径/技术域/验证条件命中的 Skill 才完整读取，最后进入当前 Ticket。下表是发布时已确认的**最低必读集合，不是 Skill allowlist**；项目 Agent 指令或实现范围触发其他项目 Skill 时，先定位并读取其入口，由 Lead 更新本 Map、重新校验后继续。

项目 Skill 使用项目根相对 Path，例如 `<Path>.agents/skills/{skill-name}/SKILL.md</Path>`；不得写机器绝对路径。若没有适用项目 Skill，保留一行 `无（已扫描项目 Skill 入口，未发现适用项）`，并在 Trigger / Scope 中记录实际扫描范围。

| Applies To | Project Skill | Trigger / Scope | Read Timing | Purpose |
|---|---|---|---|---|
| ALL | 无（已扫描项目 Skill 入口，未发现适用项） | `<Path>.agents/skills/**/SKILL.md</Path>` 与项目 Agent 指令声明的 Skill 根 | Map 后、Ticket 前 | 明确当前 change 没有额外项目 Skill 读取要求 |

## 2. 执行清单

| ID | Ticket | 跨票 Gate/依赖导航 |
|---|---|---|
| T-01 | `<Path>{roots.state}/specdev/changes/{change}/ticket/01-<ticket-name>.md</Path>` | 本 Map 第 3、6 节；正式 Goal 存在时指向原 Gate |

本表只导航实际 Ticket 和跨票合同。状态、Ready、执行 owner、深度、风险及本票写集从 Ticket frontmatter 回读，实际 workspace/集成结果从本票 Evidence 回读；不在 Map 缓存或随进度更新。Map frontmatter 的 status 表示本 Map 的结构/合同就绪与验收，不汇总或代替单票进度。

## 3. 依赖 DAG

```text
T-01
  ├─→ T-02
  └─→ T-03
        └─→ T-04
```

每条边必须表示真实开始条件。标记关键汇合点、prefactor、expand、migrate、observe、contract 和集成验证点。

## 4. 合同覆盖矩阵

| Contract ID | 覆盖 Ticket | 验证接缝 | 状态 | 说明 |
|---|---|---|---|---|
| AC-001 | T-01 | ... | covered | ... |

`uncovered` 必须修复；`deferred` 必须有用户批准、原因和后续归属。

## 5. 并行与路径所有权

- 按 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path> 分别决定票据调度、Agent 编排和 change 工作区。默认 auto；serial 逐票完成，parallel 仅推进已就绪且无冲突的票，不强制多 Agent。
- `max_parallel_tickets` 只计量票据；项目明确的实现者人数限制独立适用。一张票可由一个 Agent、subagent 或团队协作，按用户/项目/Work 要求选择。
- 所有票据引用 change README 的唯一工作区；current 可在 main 或已有 checkout，明确选择的 change worktree 创建一次后持续复用。并行和派遣不增加 worktree。
- shared owner 为专用 Ticket；项目路径以 Ticket frontmatter 为准。Lead 是正式状态与 Evidence owner，Git index 操作和全局验证协调串行。
- 只读 research/review 不构成实现票据并发，当前 Work 的独立审查要求继续生效。

| Ticket A | Ticket B | Writable 交集 | 真实依赖 | 处理 |
|---|---|---|---|---|
| T-02 | T-03 | 无 | 否 | 可并行 |

## 6. Gate、Wave 与集成点

T-tickets 可以标注候选 Wave 和行为里程碑；单票 E2E disposition 在原 Ticket。需要正式跨 Ticket 编排时，由 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/SKILL.md</Path>` 完成 Gate、Wave、Lead、动态派单边界、共享工作区验收顺序、发布与恢复，本 Map 只导航相应 Goal 章节。

## 7. 横切契约与风险

只记录跨多个 Ticket 的数据、安全、兼容、共享接口、迁移、发布和恢复规则。单 Ticket 规则留在具体 `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>`。

## 8. 维护规则

- Ticket 进度改变时只更新原 Ticket/Evidence；查看进度或恢复时重新读取它们，Map 保持不变；
- Ticket 新增、移除、ID/路径或依赖合同变化时，修复本 Map 的导航、DAG 与覆盖；不从旧 Map 恢复票级状态；
- 项目 Skill 新增、移动、删除、触发范围变化或实现中发现新的适用 Skill 时，先同步读取矩阵并重新校验；
- Goal Plan 存在时，Wave、Gate 和 owner 以 `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>` 为编排权威；
- 依赖、合同覆盖或路径所有权变化后运行 `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>`；
- 内部工件不得使用相对 Markdown 链接。

## 9. 总控与恢复

从本 Map 进入 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/SKILL.md</Path>` 的 plan/run/resume/replan/verify。先运行 `<Path>{roots.workflows}/specdev/common/tools/ticket-control.mjs</Path>` 的 `--map` 只读检查，再按 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/map-control.md</Path>` 调用 I 和真实 Skill、验收、更新状态直到完成或明确阻塞；此工具本身不执行代码。

- frontmatter 中 requested_deliverables 用 JSON 对象数组记录用户明确要求的名称与正整数 count；没有额外数量要求时用空数组，并在 deliverable_policy 记录依据，不能保留 unreviewed。
- requested_deliverables 属于用户交付合同；done 之前按实际产物核对，不从 Ticket 数量推断交付数量。
- 变更范围或验收后递增 plan_revision 并重算受影响闭包；原完成证据保留，失效证据不得复用。
- 共享语义资源在 Ticket resource_claims 声明（例如 API、表、迁移序列、正式记忆写集）；不把“不同文件”视为互不冲突。
- 未闭合事务先查原网关，其他任务冲突只暂停相关部分；全部票 done 后仍需整体 Gate、数量和集成验收。
