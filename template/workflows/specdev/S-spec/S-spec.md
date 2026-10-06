---
id: specdev/spec
type: workflow-entry
workflow: specdev
name: 编写 Spec
description: 综合已知事实、设计决定、诊断与代码现状，产出以外部行为和验收合同为权威的 Ready Spec。
keywords: [spec, PRD, 用户故事, 验收合同, 接缝, 范围, readiness]
---

# 编写 Spec

激活后读取 `<Path>{roots.workflows}/specdev/README.md</Path>` 与 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`。本 Work 综合已有事实，定义为什么、为谁、系统应表现为何，不另开宽泛访谈，也不写逐文件施工计划。

## 形成行为合同

1. **Grounding**：定位用户目标与当前代码、测试、接口、schema、配置和运行事实。按存在情况定位 change 的来源、分诊、诊断、LOG、CONTEXT、ADR 及相关永久领域词汇/决策；只回读命中原文，可选工件缺失静默跳过，不当作已确认事实。按 `<Path>{roots.workflows}/specdev/common/rules/planning-principles.md</Path>` 区分可发现事实、高影响偏好和可逆实现细节；冲突按 `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>` 返回权威 owner。
2. **关闭必要决定**：只确认会改变外部行为、接口、数据、兼容、安全、迁移、发布或验收的高价值问题。广泛取舍未定时返回 `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>`；陌生外部依赖或版本行为通过 `<Path>{roots.workflows}/specdev/common/skills/research/SKILL.md</Path>` 查证。不虚构错误码、性能阈值、法规或迁移政策。
3. **写入合同**：以 `<Path>{roots.workflows}/specdev/S-spec/spec-template.md</Path>` 写入 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`。模板拥有问题/用户/成功、正常/边界/失败/角色/状态行为、IN/REUSE/OUT、保持项、接口数据与 NFR 的完整结构及 `US-### / AC-### / NFR-### / DEC-### / OOS-###` 稳定编号。实现约束仅锁定会影响公共合同、兼容、安全或验收的决定。
4. **绑定验证接缝**：优先复用稳定接缝，通常从用户端到端行为、公共 API/CLI、事件/集成、稳定单元接缝选择；按实际风险与项目先例决定，不机械追求最高测试层级。每个接缝注明入口类型/位置、触发方式、可观察结果、覆盖 AC 和实际测试先例/命令。选择显著改变可测试性、事故半径或范围时聚焦确认；可由已有代码推导时记录依据即可。证据遵守 `<Path>{roots.workflows}/specdev/common/rules/evidence-and-verification.md</Path>`。
5. **Readiness**：对照 `<Path>{roots.workflows}/specdev/S-spec/spec-readiness.md</Path>` 与 `<Path>{roots.workflows}/specdev/common/schemas/spec.schema.json</Path>`。高影响未决问题使 `ready_for_tickets: false`；低影响、可逆默认值可作为带验证方式的显式假设。每个 AC 必须可观察、可判定、绑定接缝；不适用影响写明理由。

## 验证、状态与交接

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --stage spec --repo <project-root> <Path>{roots.state}/specdev/changes/{change}</Path>
```

回读真实 Spec、Ready 结论与状态，按激活合同只更新本 change 与全局索引的所属项。返回 Spec 完整路径、主要行为/验收合同、范围、验证接缝、风险、高影响缺口和验证结果。成功完成本 Work 才更新 `works_run` 并清空 `current_work`；可恢复失败保留入口。

只有用户请求或工作流已显式串联时才进入 `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>`；产出 Ready Spec 本身不授权实施。
