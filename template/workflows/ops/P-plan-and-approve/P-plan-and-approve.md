---
id: ops/plan-and-approve
type: workflow-entry
workflow: ops
name: 规划并批量批准部署
description: 将 Ready 评估或失败 attempt 编译为绑定项目、目标和源码的版本化计划，并记录用户对完整批次的一次性批准。
keywords: [实施计划, Plan Mode, 批量批准, 重新规划, deployment root]
---

# 规划并批量批准部署

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/ops/README.md</Path>`，再执行本入口。

P 有 `plan` 和 `record-approval` 两种模式。它拥有所有 plan/approval 版本，但不执行计划。首次部署与 attempt 失败后的 remediation/rollback 使用同一合同。

## 输入

读取 scope/project/change status、request、选定 inventory、Ready deployment model/dossier、`deployment/target-profile.json` v1、项目永久 context/ADR/runbook、change LOG/CONTEXT/ADR，以及 `<Path>{roots.workflows}/ops/common/rules/plan-and-approval.md</Path>`、`<Path>{roots.workflows}/ops/common/rules/target-profile-and-release-gates.md</Path>`、path/scope 和 redaction 规则。重新规划还必须读取触发它的 ATTEMPT 及 diagnosis；输入摘要无法重建时返回 I 或 E。

## Plan 模式

### 1. 固定输入与边界

重建 source revision、target fingerprint、snapshot/model/profile digest，确认 profile Ready、整体身份已按模式确认、唯一 deployment root 和 read/write/forbidden roots。daemon、service、cluster、database、network、global env 等进入 external mutations。

全局环境变量逐项记录 key、target scope、value source、impact、rollback 和 batch，不读取或展示值。目标、维护窗口、数据恢复或流量策略等高影响问题一次分组询问。现场 identity assertion、protected targets 或 profile 摘要漂移时返回 I，不用计划覆盖事实差异。

### 2. 编译版本化计划

创建最小未占用 `plan/plan-NNN.json` v3 与同号 Markdown，使用 `<Path>{roots.workflows}/ops/P-plan-and-approve/plan-review-template.md</Path>`。plan 绑定 target profile path/digest；非首次版本必须记录 `supersedes_plan_path`。只有 revision 由执行失败触发时才记录 `triggered_by_attempt`，用户在执行前要求修订时该字段保持 null；首次计划两者均为 null。

计划包含批次 DAG、required Gate DAG 与 `after_batches`/batch `gate_ids` 映射、typed operations、不可变候选与 staging/activation/previous refs、external mutations、preview、postconditions、verification contracts、数据保护和 rollback。batch `gate_ids` 是启动前置条件且首批可为空，Gate `after_batches` 是生成该 Gate 结论的前置批次；组合图不得成环。每个 operation 恰属一个 batch；每个 required Gate/verification 有唯一 owner，新 mutation、权限和 write set 必须显式出现。已执行旧批次只作为 attempt evidence，不冒充新计划批准或重新执行。

每个 data mutation 必须映射 data-protection 条目。production 必须使用已规划的 verified backup/restore evidence，不接受 waiver；只有 environment class=local 且用户对精确对象明确批准时，才允许包含 decision locator、exact scope、对象身份、零冲突 preflight 和 `forward-only` 恢复边界的严格 waiver。cleanup 始终是独立 batch，不从部署批准继承。

### 3. 校验并请求批准

对照 plan v3 schema，计算规范化 JSON SHA-256 并投影到 status。Ready plan 将 phase 设为 awaiting_approval、approval_status=pending。一次展示 target/profile identity、完整待执行批次与 Gate 矩阵、候选摘要、数据保护、与上一版的差异、全局环境、风险、恢复、保留/cleanup 和过期时间；要求用户在一条回复中批准一个或多个 batch ids，不逐 operation 询问。

旧 plan v2 和关联 approval 只读保留，不得重新批准或执行。继续旧 change 时生成新的 plan v3，绑定当前 profile 与需要保留的旧 attempt lineage；不得从 v2 推导 identity confirmation、Gate 或数据保护事实。

## Record-approval 模式

1. 重读唯一 current Ready plan，重新计算摘要并确认用户回复针对刚展示的完整批次矩阵。
2. 校验批准 batch 的依赖闭包、Gate 覆盖与 data-protection 前置；global environment batch 必须已展示全部 key/scope/source/impact/rollback。
3. 创建最小未占用 `plan/approval-NNN.json`，绑定 scope/project/change、plan digest、source revision、target fingerprint、batch 和期限，不保存密钥值。
4. 原子更新 status 为 phase=approved、approval_status=approved，并运行 validator `--stage pre-execute`。
5. 返回 `<Path>{roots.workflows}/ops/E-execute-and-stabilize/E-execute-and-stabilize.md</Path>`；未经用户当前决定不自动执行。

## 完成标准

- 计划绑定正确 scope、project、change、输入摘要和可重建固定点；
- plan v3 绑定 target profile v1 摘要，required Gate、verification、候选和数据保护均有 owner；
- remediation/rollback 计划可追溯到失败 attempt；
- deployment root、文件 write roots 与 external mutations 无混淆；
- 全局环境变更完整展示且无值泄露；
- production 无 waiver，local waiver 满足精确授权与完整 preflight；
- 批准按完整计划版本和批次绑定，旧工件未覆盖；
- validator 通过且没有部署或目标 mutation。

## 子文件引用

- 计划审核模板：`<Path>{roots.workflows}/ops/P-plan-and-approve/plan-review-template.md</Path>`
- Plan schema：`<Path>{roots.workflows}/ops/common/schemas/implementation-plan.schema.json</Path>`
- Approval schema：`<Path>{roots.workflows}/ops/common/schemas/approval.schema.json</Path>`
