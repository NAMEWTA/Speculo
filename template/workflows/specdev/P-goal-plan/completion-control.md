# Goal Plan 完成、证据与恢复控制

## 1. Outcome and Authority

Goal Plan 用紧凑摘要表达业务目标、受众、所有 Ticket 完成后的可观察终态、关键约束、非目标、权威来源、冲突规则和伪完成判据，不复制 Spec 的完整用户故事。

## 2. 整体 Definition of Done

整体完成至少覆盖：

- 所有计划内 Ticket 完成，cancelled 或 deferred 项有批准；
- 所有 Spec 验收合同和外部符合性要求有 Evidence；
- 项目类型检查、静态检查、测试、lint、构建、适用 CI 和受影响 E2E 完成，基线没有未经批准的退化；
- 可静默失效的关键门禁完成受控反向验证并恢复绿色；
- 迁移、兼容、调用点清零、监控、回滚和不可逆批准完成；
- 无未批准偏差、未处置高风险残余问题或伪装成通过的 `unverified` 声明；
- Ticket、Map、Goal Plan、Evidence、代码事实和状态一致。

## 3. Gate 关闭与 change 完成

每个 Gate 关闭时汇总覆盖 Evidence，检查合同、共享接口、数据、兼容、迁移和调用点，运行里程碑验证和适用 E2E，执行必要反向验证，审查偏差/风险/恢复能力，获取适用人工批准，并同步 Goal Plan、Map 和状态。

最后一个 Gate 关闭后加载 `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>`：

- Goal Plan 不含 `## Delegated Execution Addendum` 时，由最后一个计划内 `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>` 汇总并完成 change；
- Goal Plan 含完整委派附录时，由 Lead 在独立验收后完成 change。

若 triage 的 `external_action` 为 `pending-close` 或 `close-failed`，下一 Work 为 `<Path>{roots.workflows}/specdev/T-triage/T-triage.md</Path>`，否则进入 Archive。远程动作不参与本地 Gate 判断。

## 4. 不可协商约束

只记录跨多个 Ticket 且不可由实现者改变的规则，例如数据完整性、wire format 兼容、旧协议收缩条件、shared owner、安全要求、发布窗口、回滚演练和批准点。每条约束说明来源和违反后果；可由实现者沿惯例选择的事项写入 Guidance。

## 5. 偏差与暂停

偏差遵循 `<Path>{roots.workflows}/specdev/common/rules/deviation-control.md</Path>`。跨 Ticket 偏差还要说明暂停哪些 Wave/Ticket、重新打开哪个 Gate、哪些执行者需要新基线、哪些 Evidence 失效和恢复条件。

## 6. 风险与恢复

每个高风险项写明触发信号、事故半径、预防、检测、恢复、owner 和批准点。迁移或发布计划必须给出回滚不可行时的前向恢复方案。

恢复时依次读取 Goal Plan、当前 Ticket、最新 Evidence 和 change 状态，从最后已验证事实继续，不重复询问已确认事项，也不创建额外进度或阻塞文件。委派专属的 checkpoint、locator 和修正轮次由委派附录管理。

## 7. 进度与决策回报

使用可核验状态，不使用主观百分比：

```text
WAVE_STATUS wave=<n> ready=<ids> active=<ids> done=<ids> blocked=<ids>
GATE_STATUS gate=<name> state=open|closed evidence=<paths> risks=<summary>
TICKET_STATUS id=<id> state=<state> evidence=<path> deviation=<none|id>
BLOCKER id=<id> owner=<owner> needed=<decision-or-input> impact=<scope>
DECISION id=<id> owner=<owner> status=pending|approved|rejected impact=<scope>
```

委派 Goal Plan 的交付状态格式由委派协议提供，不加入普通 Goal Plan。

**完成标准**：进度可由权威工件恢复；普通计划由最后一个 Implement 完成，委派计划由 Lead 完成；所有通过、阻塞和未验证声明均能定位到具体 Evidence 与代码事实。
