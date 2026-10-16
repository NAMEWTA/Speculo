---
schema_version: 3
plan_contract_version: 1
skill_scan: unreviewed
skill_bindings: []
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: <YYYY-MM-DD-topic>
id: T-01
title: <标题>
status: draft
kind: bug
planning_depth: standard
planning_depth_reason: <触发该深度的事实>
ready: false
risk: medium
blocked_by: []
contract_ids: [AC-001]
owner: unassigned
expected_changes: ["<Path>src/example.ts</Path>"]
writable_paths: ["<Path>src/example/**</Path>"]
read_only_paths: []
shared_paths: []
shared_path_owners: []
---

# Ticket T-01: <标题>

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、独立双轴审查及完成流程。

## 目标与来源

<本票交付的可观察产出、为何需要，以及上游 AC/用户决定/诊断来源；只补充相关现状与差距。>

## 行为与范围

<描述入口、动作、结果与适用失败行为组成的完整垂直切片。引用 Spec，明确本票 IN/REUSE/OUT 和必要差异，不复制上游合同。>

## 验收标准

- [ ] `AC-001`：<本票可独立验证的结果>。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| ... | ... | ... | ... | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>` |

- **E2E disposition：** required / not-required：原因。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

覆盖真实正常、失败和回归风险；不为无关风险制造测试或重复验收条目。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

仅补充绑定字段未表达的本票约束：公共接口差异、不可交换的迁移/安全顺序、用户明确交付数量与必要批准点。局部实现由 I 决定，不要求固定步数。通用停止、检查点、集成和完成合同由执行入口负责。

## 未决事项与风险

<仅写适用风险、低影响假设及其验证方式；迁移、兼容、恢复、收缩条件和批准按实际风险展开。没有额外风险时写“无”。>

存在改变行为、接口、数据、安全、兼容、范围或验收的高影响问题时保持 `ready: false`；记录解除条件与上游 owner。

### 未决问题

无。
