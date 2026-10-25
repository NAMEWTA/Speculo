# Evidence: <Ticket ID> — <Ticket title>

本模板记录选定 change-workspace 上的实际实现与验证，不预造 source/candidate/result。Direct Spec 写 evidence/direct-spec.md；所有执行者复用 README 的 Execution Context，提交与合并仅记录实际获授权的结果。

- **Change：** `<change>`
- **Ticket：** `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>` / Direct Spec 无票
- **Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>` / 不适用
- **Lead：** `<owner-or-session-locator>`
- **工作区：** `<Path>{roots.state}/specdev/changes/{change}/README.md</Path>` 的 execution-context 锚点（唯一实际 workspace/branch/base）
- **固定交付：** 实际 commit 或工作副本快照/审查输入 locator
- **状态：** review / done / blocked / deviated / cancelled

## 1. 实现摘要

用可观察行为与已锁定合同说明实际完成内容。Cancelled 时说明为何无需实现及其权威来源。

## 2. Lead Dispatch And Candidate Return

- **执行选择与来源：** ticket_execution=auto/serial/parallel；单 Agent/subagent/team/指定工具的要求来源；README 工作区引用；验证尝试上限缺省 3
- **Implementation owners：** 实际实现及修复者身份；同票多人时列明各自写集
- **Dispatch Packet/checkpoint：** Lead direct / `<locator + immutable checkpoint>`
- **文件交接（实际外部派遣时）：** `<Path>{roots.state}/specdev/changes/{change}/sessions/{session}/{task}/TASK.md</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/sessions/{session}/{task}/REPORT.md</Path>`，以及实际存在的 `<Path>{roots.state}/specdev/changes/{change}/sessions/{session}/{task}/session-locator.json</Path>`；绑定稳定 change 身份与 change 根相对 locator，修正交付引用新任务及旧报告；Lead direct 不创建空目录
- **允许动作：** 授权路径写入、检查；commit/merge 仅明确授权时
- **返回：** checkpoint/快照、dirty 状态、实际实现者、修改路径、命令/退出码、未验证项与恢复条件
- **Lead 独立核对：** pass / fail；实际读取与命令摘要
- **只读 Agent findings：** 无 / 固定输入、来源、结论、Lead 核对

任务执行者 不写本 Evidence；以上内容由 Lead 从实际 workspace、Git 和返回事实整理。有文件交接时依 <Path>{roots.references}/coordination/session-files.md</Path> 只保存交接文件指针和 Lead 独立核验，不复制正文；REPORT 的 completed 不是本 Evidence 的 done。先读报告聚焦交接，细节不足再沿对应定位文件的 path，结合 TASK 内容检索；地址不重复写入 Evidence。突然中断无报告时记录未知事实与原工具查询结果，不补造成功回报。

## 3. 修改范围与路径所有权

既有功能的修改前，在本节简列预计修改及只需读取或验证的相关文件、调用/依赖依据和验证范围，或引用已核实仍有效的原分析。完成时对照下表中的实际改动，说明预测调整和必要前置重构的理由；影响分析不代替可写授权。

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

在 README 选定的 change-workspace 记录适用检查；冻结审查/整体测试输入前协调相关 writer 停写。

| 命令或步骤 | 运行环境 | 结果 | 摘要 |
|---|---|---|---|
| ... | change-workspace | pass / fail / not-run | ... |

- **失败后修复与重跑：** 无 / ...
- **未运行检查：** 无 / 原因与风险
- **E2E：** 按有效计划或当前 I 执行合同 的 E2E disposition 记录；未在本环境运行时说明 owner 与原因

## 6. 双轴审查

标准轴与规范轴保持独立，分别记录固定输入、结果和修正。

### 标准轴

- **固定输入：** 原 Independent Review 的 input locator、比较模式与实际摘要；已提交交付列固定 base/head，未提交交付列 working-tree 快照及其真实范围
- **结果：** pass / request-changes
- **Findings 与修正：** 无 / ...

### 规范轴

- **固定输入与来源：** Spec / Ticket / Goal Plan / source
- **结果：** pass / request-changes / blocked:missing-spec
- **Findings 与修正：** 无 / ...

两个轴分别判断并按上述顺序记录；默认同一位未参与实现的 reviewer 完成两轴。

## 7. Integration Verification

Lead 在选定 change-workspace 对固定交付执行适用集成/回归和 E2E。记录命令、退出码、真实观察、输入与运行环境。E2E disposition 为 required 或 not-required: reason；required 未执行/失败不得完成。提交、合并和发布单独列实际授权与结果，不是默认每票门。

实际运行后在本文件建立 `verification` 锚点，含 `Result: passed|failed`、`Observed: <真实观察>`，有命令时记录 `Command` 与 `Exit`。required E2E 单独可回读段另记 `Owner: <实际 Lead>`。不能以模板标题或 passed 结论自证运行。

### Failure History And Lead Recovery

| 轮次 | 阶段 | Checkpoint/snapshot | 失败事实 | 下一轮变化 |
|---|---|---|---|---|
| ... | implementation / review / workspace-verification | `<sha-or-locator>` | blocker、命令与摘要 | 首次失败待定 / Lead 决定 |

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
- **已授权 Git 交付：** 实际执行的 commit/merge 或 not-requested
- **最终交付 checkpoint/快照：** `<actual-locator>`
- **工作区引用：** `<Path>{roots.state}/specdev/changes/{change}/README.md</Path>` 的 execution-context 锚点
- **Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>`

## Skill Execution Records

按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 从真实执行轨迹填写以下 JSON 数组；每个 required 调用必须唯一匹配 Ticket 的 id、phase、operation 和 sha256，并有 passed 状态及可回读证据。没有绑定时保留空数组。仅阅读入口不能写 passed；失败/未执行保持 blocker，不伪造工具结果。

```json
[]
```

## 用户交付与源回读

记录用户要求的实际数量、交付位置、源/链接/必要元数据回读、行为差异、备份和未完成项。Goal 有显式数量时在 `<Path>{roots.state}/specdev/changes/{change}/evidence/goal-delivery.md</Path>` 写 Delivery Records，与 map 合同逐项核对。字符统计包含移动后的参考文件，不等同于 Token 或套餐用量。

## 审查证据复用（仅实际发生时填写）

记录原 CR/Evidence locator、fixed/head/diff、规范/标准/指令与 Skill/reference 摘要、工具/环境相关证据、审查者独立身份与派遣/返回核对、复用或重跑的轴与原因。未发生时写“不适用”；本节不是通过声明，也不改变原始审查结果。

## OPS 交付（仅用户请求时）

交付前读取 `<Path>{roots.workflows}/specdev/common/rules/deployment-handoff.md</Path>`，记录当前 change/Ticket、代码 revision、实际构件 digest、AC/Evidence、目标与部署约束；回传时只追加经核对的 Run/Release/receipt 指针。未请求写“不适用”，不为填表创建 OPS 任务。

## 工程检查的选择与失效

记录为什么选择这些定向检查、覆盖哪些消费者与风险；复用时列原 checkpoint/配置/输入/Skill 与有效性，失效时只列受影响项。测试删除列旧风险到新测试的承接；资源清理记录真正完成信号。专业分支按 <Path>{roots.workflows}/specdev/common/rules/engineering-evidence.md</Path> 在本文件追加标记记录；普通实施不要求空白记录，结构通过不认证真实运行。

## Workspace Execution Record

实际开始时保存唯一 JSON object，遵循 <Path>{roots.workflows}/specdev/common/schemas/execution-record.schema.json</Path>。不预造空记录：

```json
{
  "schema_version": 1,
  "ticket_id": "T-01",
  "workspace_context": "README.md#execution-context",
  "implementation_owners": ["native:actual-implementer"],
  "status": "active",
  "checkpoint": null,
  "verification": {
    "status": "pending",
    "evidence": null,
    "e2e": {"required": false, "status": "not-required", "reason": "填写实际依据", "evidence": null}
  },
  "attempts": 0
}
```

Direct Spec 用 `purpose: direct-spec`、`change: <实际 change>` 替代 ticket_id。status 为 active/review/verified/blocked/cancelled；verified 要求实际检查、独立双轴审查和 E2E 全部通过。checkpoint 指向原 Independent Review 的完整固定输入，如 `evidence/T-01.md#review-input`，verification.evidence 指向真实观察段；不复制快照或工作区字段。记录所有实际实现及修复者，正式 Evidence 只由 Lead 写入。不支持的执行版本直接拒绝，工具不改写历史原文或转换工作区。

## Acceptance Verification

Ticket 完成时按本票 contract_ids、Direct Spec 完成时按全部 Spec AC 填写本节 JSON array，每个 AC 恰一项。字段为 `id`（AC-N）、`result: passed`、`method`、`source`、`observed`；实际执行命令时增加 `command` 与 `exit: 0`。引用外部 `evidence` 文件时须提供真实匹配的 `sha256`；原 Evidence 内联实际观察不另造文件。没有执行的项不伪造 passed。普通 README 轻量模式仍用 README verification 表，二者不重复维护。

## 独立审查记录的填写

按 <Path>{roots.workflows}/specdev/common/skills/code-review/references/review-evidence.md</Path> 在本文实际生成 `Independent Review`、固定输入、原始 reviewer 输出和 Lead 核验段。完成前必须有真实独立身份与两轴结果；不要预填通过或用模板段落替代证据。
