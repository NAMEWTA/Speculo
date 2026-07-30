# Goal Plan 完成、证据与恢复控制

## 1. Outcome and Authority

Goal Plan 用紧凑摘要表达：

- 业务或用户目标；
- 目标受众或运营角色；
- 所有计划 Ticket 完成后的可观察终态；
- 关键约束；
- 明确非目标；
- 权威来源和冲突规则。

不复制 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` 的完整用户故事。

## 2. 整体 Definition of Done

整体完成至少覆盖：

- 所有计划内 Ticket 完成，cancelled 或 deferred 项有批准；
- 所有 Spec 验收合同和外部符合性要求有 Evidence；
- 项目类型检查、静态检查、测试、lint、构建和适用 CI 完成；仅 UI 交互受影响时由 Lead 完成 E2E；
- 迁移、兼容、调用点清零、监控、回滚和不可逆批准完成；
- 无未批准偏差和未处置高风险残余问题；
- Ticket、Map、Goal Plan、Evidence 和状态一致。

## 3. Gate 关闭仪式

每个 Gate 关闭时：

1. 汇总覆盖的 `<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>`；
2. 检查对应合同和参考符合性；
3. 检查共享接口、数据、兼容、迁移和调用点；
4. 运行里程碑级验证；仅 UI 交互受影响时由 Lead 运行最小 E2E；
5. 审查失败分类、偏差、残余风险和恢复能力；
6. 获取适用人工批准；
7. 同步 `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`、`<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>` 和状态工件。

## 4. 不可协商约束

只记录跨多个 Ticket 且不可由实现者改变的规则，例如数据完整性、wire format 兼容、旧协议收缩条件、shared owner、安全要求、发布窗口、回滚演练和批准点。

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

## 6. 风险与恢复

每个高风险项写明：触发信号、事故半径、预防措施、检测方式、恢复动作、owner 和批准点。迁移或发布计划必须给出回滚不可行时的前向恢复方案。

## 7. 进度与决策回报

使用可核验状态，不使用主观百分比：

```text
WAVE_STATUS wave=<n> ready=<ids> active=<ids> done=<ids> blocked=<ids>
GATE_STATUS gate=<name> state=open|closed evidence=<paths> risks=<summary>
TICKET_STATUS id=<id> state=<state> evidence=<path> deviation=<none|id>
BLOCKER id=<id> owner=<owner> needed=<decision-or-input> impact=<scope>
DECISION id=<id> owner=<owner> status=pending|approved|rejected impact=<scope>
```

具体路径必须以完整 Path 标签 形式填写。
