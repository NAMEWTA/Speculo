---
id: ops/archive-and-learn
type: workflow-entry
workflow: ops
name: 复盘、沉淀并归档
description: 从 completed change 的全部 attempts 生成完整复盘，经用户确认后合并项目 SOP 与全局知识，并事务化归档到所属 scope。
keywords: [复盘, 错误教训, SOP, 知识合并, 项目归档]
---

# 复盘、沉淀并归档

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/ops/README.md</Path>`，再执行本入口。

A 是 RETROSPECTIVE、知识提升和 scope-aware 归档的唯一 owner。它保留完整失败历史，但只把有证据、仍有效且对后续工作有用的结论合并为现役知识。

## 流程

### 1. 验证完成证据

选择用户指定或唯一 completed change，读取 request、inventory、deployment/target profile、全部 plan/approval、全部 attempts、typed journals、verification states、HANDOFF、LOG、CONTEXT 和 ADR，并加载 `<Path>{roots.workflows}/ops/common/rules/closure-and-learning.md</Path>`。状态不是 completed、outcome pending、最终验证缺失、存在 blocker 或目标未知时停止。

旧 plan v2 与 attempt v1 只读保留，不在 A 中迁移、补字段或重释为新合同证据。若 completed 候选只有旧 attempt，没有最终 verification-only attempt v2 及其 verification state/HANDOFF，则停止归档并返回 E 补验；在此之前不得通过 pre-close/pre-archive，也不得把旧摘要提升为现役知识。

### 2. 生成完整复盘

使用 `<Path>{roots.workflows}/ops/A-archive-and-learn/retrospective-template.md</Path>` 生成 change 根 `RETROSPECTIVE.md`。穷尽每个 attempt，记录时间线、target profile/identity 漂移、Gate 结果、脱敏错误 signature、确认/排除的假设、根因 confidence、计划偏差、尝试过的动作、数据保护、保留/恢复资产、最终有效步骤、回滚、验证、残余风险和教训。

成功步骤必须能回链到 journal 与 verification；失败实验不能伪装成 SOP。succeeded 可提升已验证部署 SOP，rolled_back 只提升恢复 SOP和故障规避，abandoned 只提升已确认约束/根因/注意事项。

### 3. 生成知识提升计划

使用 `<Path>{roots.workflows}/ops/A-archive-and-learn/promotion-plan-template.md</Path>` 写 `promotion/plan.md`，并生成符合 `<Path>{roots.workflows}/ops/common/schemas/promotion-manifest.schema.json</Path>` 的 `promotion/manifest.json` 与 staging 文件。

默认将知识留在 project scope：稳定配置/拓扑进入项目 context，重要权衡进入项目 ADR，成功步骤和已确认错误处理进入项目 runbooks。只有跨项目/宿主机/运行时/容器平台事实有明确适用范围和证据时，才进入根级 global context/ADR/runbooks。原始日志、瞬时状态、未确认推断和一次性命令全部 archive-only。

同一 SOP 按 project + environment + deployment method + component 的 stable key 执行 create/merge/supersede，不简单追加。冲突事实、删除现役步骤或缩小恢复能力必须作为 blocker 交给用户。

### 4. Dry-run 与批量确认

运行 close tool 的 dry-run 和 validator `--stage pre-archive`，展示完整 retrospective 摘要、每项 project/global/archive-only 分类、目标 diff、索引变化、移动目标和 rollback manifest。未确认时不写永久知识、不移动 change。

用户一次确认精确 manifest 后，创建 `promotion/approval.json`，绑定规范化 manifest SHA-256、决定摘要和时间。不得从最初“部署”请求推断归档或永久知识改写批准。

### 5. 事务应用与重读

调用 `<Path>{roots.workflows}/ops/common/tools/close-change.mjs</Path>`，传入 state root、scope、project/change 和批准摘要。工具验证 staging/target hash，备份既有目标，自叶到根原子应用知识，更新 status，并移动到 scope 对应 archive；失败时按 rollback evidence 恢复。

完成后运行 validator `--stage complete`，确认 active 源不存在、archive 完整、tuple 索引一致、永久知识 hash 与 manifest 相同。归档只读；后续修正创建同项目或 global scope 的 follow-up change。

## 完成标准

- RETROSPECTIVE 覆盖全部 attempts、错误、根因、错误假设、最终路径和教训；
- 最终 attempt v2 的 verification state 与无密钥 HANDOFF 已通过，legacy 证据未被改写或冒充新验证；
- SOP 只包含成功验证步骤，故障知识标明 evidence/confidence/last_verified；
- project 与 global 提升边界明确，无项目特有内容污染全局知识；
- 用户批准绑定精确 promotion manifest，dry-run 前零永久写入；
- change 移入所属项目或 global archive，状态和内容重读一致；
- complete validator 无 error。

## 子文件引用

- 复盘模板：`<Path>{roots.workflows}/ops/A-archive-and-learn/retrospective-template.md</Path>`
- 提升计划模板：`<Path>{roots.workflows}/ops/A-archive-and-learn/promotion-plan-template.md</Path>`
- 关闭与知识规则：`<Path>{roots.workflows}/ops/common/rules/closure-and-learning.md</Path>`
