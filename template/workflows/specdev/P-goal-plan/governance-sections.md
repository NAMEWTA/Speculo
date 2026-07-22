# 治理章节 §6-8 编写规程

编写 goal-plan 的里程碑验收、硬约束和进度回报格式。这三个章节定义"怎么验收"和"怎么追踪"。

## §6 — Milestone-Level Acceptance

### 五项仪式步骤

全部 ticket 关闭后执行以下验收仪式：

1. **合同/ADR 终审** —— 如果激活合同模式：逐行检查合同文档，确认所有行状态为 `done` 或 `deviate`（有记录理由），无 `todo` 残留；如果无合同但激活 ADR 模式：检查 ADR 偏差表条目已解决或明确记录为 `deviate`
2. **整体验证门禁** —— 运行 `pnpm verify`（或 spec 中指定的验证命令），确认全绿
3. **集成回归走查** —— 完成一次端到端用户旅程脚本走查
4. **关闭 spec issue** —— 关闭关联的 spec issue，引用 milestone done
5. **人工 side-by-side 验证清单** —— 输出人工核对清单供用户在真机上执行最终手感验收

### 集成回归走查脚本构造

从 spec.md 的 User Stories 和 ticket 的验收标准推导端到端用户旅程：

- 提取每个 User Story 的关键交互步骤
- 按用户使用顺序串联（不按 ticket 编号）
- 每个步骤写为具体的操作指令（命名具体的按钮、输入、期望行为）
- 覆盖主路径和至少一条备选路径

格式：编号列表，每一步包含"操作 → 期望"。

### 人工 side-by-side 清单构造

- 按门禁层级（P0/P1/P2）分组
- 如果激活参考权威模式：每项包含参考权威对比步骤（"对照 X 中的 Y——行为是否一致？"）
- 结尾注明："自动化不替代最终手感环节"

### 草拟与确认

输出 §6 完整草案（五项步骤 + 回归走查脚本 + side-by-side 清单分组）。等待用户确认后进入 §7。

## §7 — Hard Constraints

### 约束推导

从模式检测和 ADR 推导所有非协商约束。每条约束写为一句声明 + 违反后果。

#### 通用约束（所有 goal-plan 包含）

1. **合同/规格冻结** —— 如激活合同模式：「合同一旦冻结不得修改。如需修改，先修改合同再继续实现。违反即返工。」；否则：「spec 的 User Stories 和 Implementation Decisions 为权威。超出 spec 的范围变更需先更新 spec。」
2. **领域不变量优先** —— 「架构决策中声明的领域不变量先于实现便利。违反即返工。」
3. **伪完成禁止** —— 「能力存在但手感、交互细节、边界情况、空状态文案与参考/规格不一致，视为未完成。禁止以"API 通了"为由关闭 ticket。」
4. **Git 纪律** —— 如果使用 Lead+Subagent 模型：「仅 Lead 操作 Git（提交、合并、推送）。子代理输出 diff/patch，Lead 审查后提交。」
5. **单一真相源** —— 「不复活废弃组件、不创建规格外的新抽象、不引入与 ADR 冲突的外部依赖。所有技术决策追溯到 ADR 或 LOG。」
6. **沟通语言** —— 「全部代码注释、提交信息、issue 评论、进度报告使用简体中文。」

#### 模式特定约束

- **合同模式**：「合同条目状态回写必须在 ticket 关闭前完成。先回写合同，再关闭 issue。」
- **参考权威模式**：「任何与参考权威的行为差异必须追溯到一个偏差条目（DEV-NN）。无条目偏差视为缺陷。」
- **Lead+Subagent 模式**：「Lead 不得实现代码。发现 Lead 写实现代码时输出 DELEGATION_VIOLATION 并重新派单。子代理不得提交——只输出 patch。」
- **偏差模式**：「偏差条目（DEV-NN）关闭条件是：要么通过实现消除偏差，要么在偏差表中记录为 deviate 并附理由。」

### 草拟与确认

输出 §7 完整约束列表。等待用户确认后进入 §8。

## §8 — Progress Reporting Format

### 模板定制

根据执行模型和合同模式定制进度回报格式：

#### TICKET_DONE 格式（Lead+Subagent 模型）

```
TICKET_DONE <n> (<k>/<N>) gate=<P0|P1|P2> contract_ids=<P0-01,P1-03> verify=<cmd:result> commit=<sha>
```

字段说明：
- `<n>` —— ticket 编号（两位零填充纯数字，如 `01`，不含 `#`）
- `(<k>/<N>)` —— 进度计数（当前第几个 / 总数）
- `gate` —— 门禁层级
- `contract_ids` —— 如激活合同模式，列出本 ticket 覆盖的合同条目 ID，逗号分隔；如无合同则使用 `adr_ref=<ADR-NNNN>`
- `verify` —— 验证命令及结果（PASS/FAIL）
- `commit` —— 提交 SHA

#### MILESTONE_DONE 格式

所有 ticket 关闭后输出：

```
MILESTONE_DONE issues_closed=<N>/<N> contract_todo=0 verify=GREEN
```

如果无合同模式：将 `contract_todo=0` 替换为 `adr_deviate_resolved_or_recorded=YES`。

#### 格式变体

- **切面跟踪**（ticket 数 > 15 时推荐）：在 TICKET_DONE 中增加 `slice=<ADR|DATA|SHELL|WORK|...>` 字段，按切面分组追踪进度
- **简化模型**：使用简化格式 `TICKET_DONE <n> verify=<cmd:result>`

### 草拟与确认

输出 §8 格式定义，包含一个填写示例。等待用户确认。

**完成标准**：§6 五项验收步骤完整、回归走查脚本覆盖主路径和一条备选路径、side-by-side 清单按门禁分组；§7 约束条条为一句声明+后果、模式特定约束已根据检测结果定制；§8 模板字段已填入本里程碑的具体值（N、合同路径、验证命令），经用户确认。
