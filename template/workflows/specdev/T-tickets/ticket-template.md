---
schema_version: 3
artifact: ticket
change: <YYYY-MM-DD-topic>
id: T-01
title: <标题>
status: draft
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

- **Ticket 文件：** `<Path>{roots.state}/specdev/changes/{change}/ticket/01-<ticket-name>.md</Path>`
- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>`

## 1. 战略与来源

- **目标：** 做什么、为什么、基于什么现有能力。
- **可观察产出：** 完成后用户、调用者或系统外部可以观察到什么。
- **来源：** `US-###`、`AC-###`、`ADR-###`、`USER-DECISION`、`CODE`、`RESEARCH` 或 `DIAG-###`。
- **当前事实：** 相关现状与目标差距；项目文件使用项目相对 Path 标签，例如 `<Path>src/example.ts</Path>`。
- **Planning Depth 原因：** 说明为什么是 Lite、Standard 或 Deep。

## 2. 决策状态

### 已锁定决策

- ...

### 已采用的低影响假设

- 无。

### 未决问题

无。

存在会改变行为、接口、数据、兼容、安全、范围、迁移或验收的问题时，frontmatter 中 `ready` 必须为 `false`。

## 3. 范围边界

| IN（本 Ticket 构建） | REUSE（复用且不改变契约） | OUT（明确不做） |
|---|---|---|
| ... | ... | ... |

## 4. 要构建什么

从用户或调用者视角描述一条完整行为路径：入口、动作、可观察结果、失败行为和边界。不要按数据库、后端、前端、测试等技术层分段罗列。

## 5. 实现契约

<!-- Lite 可压缩为适用条目；Standard 和 Deep 必填。 -->

- **入口或接缝：**
- **输入与输出：**
- **公共接口变化：** 无 / ...
- **不变量：**
- **状态或数据流：**
- **错误与失败行为：**
- **兼容要求：**
- **安全与隐私要求：** 不适用：原因 / ...

## 6. 执行路线

<!-- Lite 通常 1–3 步；Standard 和 Deep 通常 3–7 步。描述行为顺序、安全落点和验证时机，不写逐行代码。 -->

1. 建立或确认验证接缝，使目标行为或关键风险按预期失败。
2. ...
3. 形成保持仓库可验证的安全落点。
4. 运行定向验证和适用回归。

## 7. 路径访问契约

- **预计修改点：** 与 `expected_changes` 对齐，仅作导航。
- **可写范围：** 与 `writable_paths` 对齐；越界前必须停止。
- **只读上下文：** 与 `read_only_paths` 对齐。
- **共享路径：** 与 `shared_paths` 对齐；每项在 `shared_path_owners` 指定唯一 owner。
- **保留或不动：** 无 / ...

项目路径必须写成项目相对 Path 标签。SpecDev 工件必须使用完整根变量 Path 标签。

## 8. 验证矩阵

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 正常路径 | ... | ... | ... | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>` |
| 失败路径 | ... | ... | ... | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>` |
| 回归 | ... | ... | ... | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>` |

不适用的关键风险类别必须写“不适用：原因”。

- **Workspace checks：** 按 Goal Plan 在 current workspace 或 source worktree 运行单元、组件、静态、类型、lint/build 等适用非 E2E 检查。
- **E2E disposition：** required / not-required：原因。
- **E2E owner/environment：** Lead / current-workspace 或 parent-candidate；required 时写明场景、接缝与预期。
- **Integration evidence：** implementation/source commit、parent before、适用 candidate/result SHA 和父分支包含关系。

E2E 由实际跨边界行为与风险决定，不限于 UI；required 模式不得在 Ticket source worktree 运行或声明通过。

## 9. 发布、迁移与恢复

<!-- Deep 必填；其他深度仅在适用时保留。 -->

- **迁移顺序：** 不适用：原因 / ...
- **兼容窗口：** 不适用：原因 / ...
- **监控信号：** 不适用：原因 / ...
- **回滚或前向恢复：**
- **不可逆操作与批准点：** 无 / ...
- **收缩条件：** 不适用：原因 / 旧调用点、旧数据或旧协议使用量为零并有 Evidence。

## 10. 验收标准

- [ ] `AC-001`：<可判定结果>。
- [ ] 验证矩阵全部执行并记录到 `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>`。
- [ ] 实际项目修改未超出 `writable_paths`，shared path 由指定 owner 修改。
- [ ] Ticket 已按 Goal Plan 策略形成非空 implementation/source commit，direct-parent 或 candidate 验证通过且父分支 result 已记录。
- [ ] E2E disposition 已执行；required 模式 E2E 在 parent-candidate、current 模式在 current workspace 由 Lead 完成。
- [ ] 未发生未批准的范围、契约或发布偏差。
- [ ] Ticket、Tickets Map 和 Evidence 状态一致。
