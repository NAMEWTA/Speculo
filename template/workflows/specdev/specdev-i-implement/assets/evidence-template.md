# Evidence: <Ticket ID> — <Ticket title>

本模板按有效计划或当前 I 的 workspace/integration 策略记录实际验证环境；不适用的环境明确写 `not-applicable`，不伪造 source、candidate 或 result 链。Direct Spec 使用本模板时写入 `<Path>{roots.state}/specdev/changes/{change}/evidence/direct-spec.md</Path>`，current 使用实施前基线和最终 checkpoint；required 保存真实 change 工作区集成链，不填 Ticket ID。

- **Change：** `<change>`
- **Ticket：** `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>`
- **Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>` / 不适用
- **Lead：** `<owner-or-session-locator>`
- **Workspace/branch：** `<workspace_ref>` / `<branch>`
- **Base/implementation-or-source/candidate/result SHA：** `<sha>` / `<sha>` / `<sha>` / `<sha>`
- **状态：** review / done / blocked / deviated / cancelled

## 1. 实现摘要

用可观察行为与已锁定合同说明实际完成内容。Cancelled 时说明为何无需实现及其权威来源。

## 2. Lead Dispatch And Candidate Return

- **执行选择与来源：** 当前宿主正常执行（mode: lead，App/CLI 等）/ 显式 CLI 交互或调用 / Herdr / 其他已选方式；current / required；实际用户选择或有效计划来源，无 Goal 时默认串行、集成尝试上限 3
- **Implementation owner：** Lead / `<agent/provider>`
- **Dispatch Packet/checkpoint：** Lead direct / `<locator + immutable checkpoint>`
- **允许动作：** worktree changes / implementation commit / ...
- **返回：** commit、dirty 状态、修改路径、非 E2E 命令、未验证项与恢复条件
- **Lead 独立核对：** pass / fail；实际读取与命令摘要
- **只读 Agent findings：** 无 / 固定输入、来源、结论、Lead 核对

任务执行者 不写本 Evidence；以上内容由 Lead 从实际 workspace、Git 和返回事实整理。

## 3. 修改范围与路径所有权

| 路径 | 所有权 | 改动目的 |
|---|---|---|
| `<Path>src/example.ts</Path>` | writable / shared:<owner> | ... |

- **read-only 修改：** 无
- **未声明路径：** 无
- **生成文件/锁文件：** 无 / 来源与 owner

## 4. 验收与合同映射

| Contract / Acceptance ID | 验证接缝 | 证据 | 结果 |
|---|---|---|---|
| AC-... | ... | 测试、日志或人工检查摘要 | pass / fail / not-run |

每个 Ticket 验收项或 Direct Spec AC 恰好落到一行。

## 5. Workspace Verification

按有效计划或当前 I 执行合同 记录 current workspace 或 source worktree 检查，并注明运行环境。

| 命令或步骤 | 运行环境 | 结果 | 摘要 |
|---|---|---|---|
| ... | current-workspace | pass / fail / not-run | ... |

- **失败后修复与重跑：** 无 / ...
- **未运行检查：** 无 / 原因与风险
- **E2E：** 按有效计划或当前 I 执行合同 的 E2E disposition 记录；未在本环境运行时说明 owner 与原因

## 6. 双轴审查

标准轴与规范轴保持独立，分别记录固定输入、结果和修正。

### 标准轴

- **固定输入：** `<base_sha>..<source_checkpoint>`
- **结果：** pass / request-changes
- **Findings 与修正：** 无 / ...

### 规范轴

- **固定输入与来源：** Spec / Ticket / Goal Plan / source
- **结果：** pass / request-changes / skipped:no-spec
- **Findings 与修正：** 无 / ...

两个轴隔离并按上述顺序记录。

## 7. Integration Verification

按有效计划或当前 I 执行合同 记录 direct-parent 或 parent-candidate 集成；未采用的字段写 `null` 或 `not-applicable`。

| 项目 | 结果 |
|---|---|
| Parent before SHA | `<sha>` |
| Implementation/source SHA | `<sha>` / `<sha>` |
| Candidate branch/workspace | current / `<branch>` / `not-applicable` |
| Method/conflicts | direct-parent / fast-forward / merge-commit；无 / paths |
| Integration checks | 命令、运行环境 `current-workspace`、结果 |
| E2E disposition | required / not-required: reason |
| E2E result | pending / passed / failed / not-required；场景与证据 |
| Parent result/re-read | `<sha>`；HEAD/tree/ancestor 核对 |

集成失败时明确父 HEAD 是否推进、失败命令、旧 SHA 和恢复条件。

### Failure History And Lead Recovery

| 轮次 | 阶段 | Checkpoint/candidate | 失败事实 | 下一轮变化 |
|---|---|---|---|---|
| ... | implementation / review / direct-parent / parent-candidate | `<sha-or-locator>` | blocker、命令与摘要 | 首次失败待定 / Lead 决定 |

- **共同失败模式：** not-applicable / ...
- **最可能原因：** not-applicable / ...
- **下一轮具体改变：** not-applicable / ...
- **下一 owner/路由：** not-applicable / same owner / new owner / Lead / upstream owner

首次失败不要求额外分类；同一 blocker 反复出现、下一轮没有新证据，或 integration attempts 达到有效上限时，Lead 必须填写以上四项。重置 attempts 后仍保留此前轮次，不覆盖失败历史。

## 8. 偏差与决策

- **偏差：** 无 / `<deviation-id>`
- **记录：** `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>` / 不适用
- **批准来源及影响：** ...

## 9. 残余风险与交付定位

- **残余风险/已知限制：** 无 / ...
- **后续 Ticket：** 无 / `<ticket-id>`
- **监控或回滚触发：** 不适用 / ...
- **Source commit：** `<sha>`
- **Parent result：** `<sha>`
- **Source workspace：** `<workspace_ref>`
- **Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>`

## Skill Execution Records

按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 从真实执行轨迹填写以下 JSON 数组；每个 required 调用必须唯一匹配 Ticket 的 id、phase、operation 和 sha256，并有 passed 状态及可回读证据。没有绑定时保留空数组。仅阅读入口不能写 passed；失败/未执行保持 blocker，不伪造工具结果。

```json
[]
```

## 用户交付与源回读

记录用户要求的实际数量、交付位置、源/链接/必要元数据回读、行为差异、备份和未完成项。Goal 有显式数量时在 `<Path>{roots.state}/specdev/changes/{change}/evidence/goal-delivery.md</Path>` 写 Delivery Records，与 map 合同逐项核对。字符统计包含移动后的参考文件，不等同于 Token 或套餐用量。

## 审查证据复用（仅实际发生时填写）

记录原 CR/Evidence locator、fixed/head/diff、规范/标准/指令与 Skill/reference 摘要、工具/环境相关证据、两轴隔离核对、复用或重跑的轴与原因。未发生时写“不适用”；本节不是通过声明，也不改变原始审查结果。

## OPS 交付（仅用户请求时）

交付前读取 `<Path>{roots.workflows}/specdev/common/rules/deployment-handoff.md</Path>`，记录当前 change/Ticket、代码 revision、实际构件 digest、AC/Evidence、目标与部署约束；回传时只追加经核对的 Run/Release/receipt 指针。未请求写“不适用”，不为填表创建 OPS 任务。

## 工程检查的选择与失效

记录为什么选择这些定向检查、覆盖哪些消费者与风险；复用时列原 checkpoint/配置/输入/Skill 与有效性，失效时只列受影响项。测试删除列旧风险到新测试的承接；资源清理记录真正完成信号。专业分支按 <Path>{roots.workflows}/specdev/common/rules/engineering-evidence.md</Path> 在本文件追加标记记录；普通实施不要求空白记录，结构通过不认证真实运行。

## Workspace Execution Record

独立 Ticket 或 required Direct Spec 真正开始时，在本节保存本单元 workspace 执行字段的唯一 JSON object：base_sha、parent_branch、workspace/implementation/integration owner、workspace_ref、branch、source_checkpoint、status、integration 的 candidate/result/验证/E2E/attempts 等。由实际操作生成，不能预填空对象；current/direct-parent 与 required/source/parent-candidate 仍各按原合同验证。其他表格只说明和导航这些事实，不复制第二套可写状态；Direct Spec 使用 purpose=direct-spec、change 和 integration_attempt_limit 代替 ticket_id；required 必须记录，current 可保留原 checkpoint 证据不造集成记录。字段和生成步骤见 <Path>{roots.workflows}/specdev/common/skills/dev-worktree/references/create.md</Path>。无票不创建 Ticket/Map/Goal，历史 current 证据不回填。

## Acceptance Verification

仅独立 Spec 的无票 Direct Spec 完成时填写本节 JSON array，每个 Spec AC 恰一项。字段为 `id`（AC-N）、`result: passed`、`method`、`source`、`observed`；实际执行命令时增加 `command` 与 `exit: 0`。引用外部 `evidence` 文件时须提供真实匹配的 `sha256`；原 Evidence 内联实际观察不另造文件。没有执行的项不伪造 passed。普通 README 轻量模式仍用 README verification 表，二者不重复维护。
