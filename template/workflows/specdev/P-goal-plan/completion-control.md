# Goal Plan 完成、证据与恢复控制

## 1. Outcome and Authority

Goal Plan 用紧凑摘要表达：

- 业务或用户目标；
- 目标受众或运营角色；
- 所有计划 Ticket 完成后的可观察终态；
- 关键约束；
- 明确非目标；
- 权威来源和冲突规则；
- 看似有主路径但违反边界、数据、兼容或证据要求的伪完成判据。

不复制 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` 的完整用户故事。

## 2. 整体 Definition of Done

整体完成至少覆盖：

- 所有计划内 Ticket 完成，cancelled 或 deferred 项有批准；
- 所有 Spec 验收合同和外部符合性要求有 Evidence；
- 项目类型检查、静态检查、测试、lint、构建和适用 CI 完成，测试数量、skip/todo、覆盖率或等价基线没有未经批准的退化；仅 UI 交互受影响时由 Lead 完成 E2E；
- 可静默失效的关键门禁完成受控反向验证并恢复绿色；普通门禁有明确不适用结论，不为形式破坏环境；
- 迁移、兼容、调用点清零、监控、回滚和不可逆批准完成；
- 无未批准偏差和未处置高风险残余问题；
- Ticket、Map、Goal Plan、Evidence、源码 checkpoint 和状态一致；
- provider 或 Worker 自报结果均已由 Lead 核对，未核对项保持 `unverified`。

## 3. Gate 关闭仪式

每个 Gate 关闭时：

1. 汇总覆盖的 `<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>`；
2. 检查对应合同和参考符合性；
3. 检查共享接口、数据、兼容、迁移和调用点；
4. 运行里程碑级验证；仅 UI 交互受影响时由 Lead 运行最小 E2E；
5. 对会出现“坏了但仍绿色”的关键门禁运行受控反向验证，记录失败信号和恢复后的通过证据；
6. 审查基线退化、失败分类、偏差、残余风险和恢复能力；
7. 获取适用人工批准；
8. 同步 `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`、`<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>` 和状态工件。

## 4. 不可协商约束

只记录跨多个 Ticket 且不可由实现者改变的规则，例如数据完整性、wire format 兼容、旧协议收缩条件、shared owner、安全要求、发布窗口、回滚演练和批准点。

每条约束同时说明违反后果。可由实现者沿现有惯例选择、且不改变行为或风险的事项写入 Guidance，不伪装成硬约束。

来源必须指向：

- `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`；
- `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`；
- 具体 `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>`；
- 外部 Url 标签；
- `<Path>{roots.state}/specdev/config.json</Path>`。

## 5. 偏差与暂停

偏差等级和处理遵循 `<Path>{roots.workflows}/specdev/common/rules/deviation-control.md</Path>`。

跨 Ticket 偏差还必须明确：

- 暂停哪些 Wave 或 Ticket；
- 哪个 Gate 重新打开；
- 哪些 Agent 需要重新基线；
- 哪些 Evidence 失效；
- 重新开始的条件。

## 6. 风险、修正与恢复

每个高风险项写明：触发信号、事故半径、预防措施、检测方式、恢复动作、owner 和批准点。迁移或发布计划必须给出回滚不可行时的前向恢复方案。

每个 Dispatch Packet 记录 checkpoint、workspace/session locator、最近已验证 Evidence 和 `max_correction_rounds`。默认同一验收项最多修正 3 轮；达到上限后暂停当前 Ticket 和受影响 Wave，保留已通过行为，形成包含失败命令、最小错误、责任方和恢复条件的 blocker。

恢复时依次读取 `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`、当前 Ticket、最新 Evidence 和 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`。从最后已验证 checkpoint 继续，不重复询问已确认事实，也不创建额外进度或阻塞文件。

## 7. 进度与决策回报

使用可核验状态，不使用主观百分比：

```text
WAVE_STATUS wave=<n> ready=<ids> active=<ids> done=<ids> blocked=<ids>
GATE_STATUS gate=<name> state=open|closed evidence=<paths> risks=<summary>
TICKET_STATUS id=<id> state=<state> evidence=<path> deviation=<none|id>
DELIVERY_STATUS id=<id> model=<model> checkpoint=<sha> locator=<ref> corrections=<n> unverified=<items|none>
BLOCKER id=<id> owner=<owner> needed=<decision-or-input> impact=<scope>
DECISION id=<id> owner=<owner> status=pending|approved|rejected impact=<scope>
```

具体路径必须以完整 Path 标签 形式填写。

**完成标准**：进度可由权威工件恢复；所有通过、阻塞和未验证声明均能定位到具体 Evidence 与源码 checkpoint。
