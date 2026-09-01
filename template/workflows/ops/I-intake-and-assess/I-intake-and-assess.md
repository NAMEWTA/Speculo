---
id: ops/intake-and-assess
type: workflow-entry
workflow: ops
name: 摄入并评估运维目标
description: 初始化 Ops，识别全局或项目 scope，创建或恢复 change，并用系统盘点、项目分析和目标身份形成可规划部署档案。
keywords: [摄入, change, 项目识别, 系统盘点, 部署分析, target profile]
---

# 摄入并评估运维目标

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/ops/README.md</Path>`，再执行本入口。

I 是初始化、scope/project/change 选择、部署模型和 target profile 的唯一 owner。它回答“当前工作属于哪里、目标现在是什么、项目需要怎样部署、现场身份与授权边界是什么、是否已经可以规划”，不构建、安装、启动服务或修改目标。

## 流程

### 1. 初始化与确定 Scope

读取 `<Path>{roots.workflows}/ops/common/rules/project-and-change-scope.md</Path>`。缺少状态时以 schema v2 seed 原子创建 `status.json`，并创建不存在的全局 `changes/`、`archive/`、`context/`、`adr/`、`runbooks/` 和 `projects/`；已有内容只验证，不覆盖或猜测迁移。

系统基线、Docker/宿主机通用配置或跨项目文档使用 `scope=global`。指定项目的部署、修复、扩容、升级和回滚使用 `scope=project`。项目 scope 必须解析或创建 `<Path>{roots.state}/ops/projects/{project_id}/project.json</Path>`，对照 `<Path>{roots.workflows}/ops/common/schemas/project.schema.json</Path>` 验证稳定 id、显示名、aliases 和无凭据 identity。

### 2. 创建或恢复 Change

在 scope 根选择用户指定 change、唯一 active change 或新 change；多个候选一次性消歧。新 change 使用 `YYYY-MM-DD-<topic>[-NN]`：project scope 从 `<Path>{roots.workflows}/ops/I-intake-and-assess/change-status-template.json</Path>` 创建 `.status.json`，global scope 从 `<Path>{roots.workflows}/ops/I-intake-and-assess/global-change-status-template.json</Path>` 创建；随后用 `<Path>{roots.workflows}/ops/I-intake-and-assess/request-template.md</Path>` 初始化 request、LOG、CONTEXT 和 ADR。

先原子写 change，再将 `{scope, project_id, change}` 加入全局 active。归档历史只读；继续历史时创建 follow-up，并记录 `derived_from` 的完整 scope locator。项目 change 根必须是 `<Path>{roots.state}/ops/projects/{project_id}/changes/{change}/</Path>`，不得使用全局 flat change 目录。

### 3. 盘点目标系统

读取 `<Path>{roots.workflows}/ops/common/rules/path-and-scope-contract.md</Path>` 和 `<Path>{roots.workflows}/ops/common/rules/evidence-and-redaction.md</Path>`，按 `<Path>{roots.workflows}/ops/I-intake-and-assess/collector-catalog.md</Path>` 运行适用 L0/L1 collectors。L2 只针对用户一次批准的根列表。

把不可覆盖快照写入 change `inventory/snapshots/{snapshot-id}.json`，并从 `<Path>{roots.workflows}/ops/I-intake-and-assess/system-report-template.md</Path>` 更新 `inventory/system-report.md`。瞬时 Docker/进程/端口状态只留在 change；稳定系统事实在 A 阶段才可提升为全局 context。

### 4. 分析项目部署与目标身份

global inventory-only 请求跳过 deployment model，但仍为 verification-only 目标生成非 mutation target profile；global 配置变更则以 `project=null` 建立系统配置 deployment model。project scope 读取真实项目指令和 `<Path>{roots.workflows}/ops/I-intake-and-assess/project-detection.md</Path>`，穷尽实际 manifest、lockfile、容器、CI/CD、配置、服务、集群、数据、健康和恢复线索；结构化格式使用 parser。

读取 `<Path>{roots.workflows}/ops/common/rules/target-profile-and-release-gates.md</Path>`，从 `<Path>{roots.workflows}/ops/I-intake-and-assess/target-profile-template.json</Path>` 生成 `deployment/target-profile.json` v1，并按 `<Path>{roots.workflows}/ops/common/schemas/target-profile.schema.json</Path>` 验证。profile 选择 `audit | takeover | fresh | release | upgrade | rollback`，记录 environment class、唯一 deployment root、existing state、不可拆分 identity assertions、owned/protected/unknown targets、差异分类和 secret provider/locator 元数据。

只要存在持久目录、控制面资源、数据、路由或服务，就使用 takeover；现场为 present 或 unknown 时不得选择 fresh。fresh 只在目标为空、归属明确且 protected/unknown targets 为空时 Ready。mutation 模式必须有整体 identity confirmation；ownership-conflict、unknown difference、未确认身份或不明 deployment root 都使 profile blocked。

会联网、执行项目代码、写 cache 或下载依赖的动态 probe 只登记，不在 I 执行。写入 `deployment/deployment-model.json`、`deployment/target-profile.json` 和 `deployment/deployment-dossier.md`，分别对照 schema 与 `<Path>{roots.workflows}/ops/I-intake-and-assess/deployment-dossier-template.md</Path>`。配置和 secret requirement 只记录 key、scope、provider/受控 source ref、version/presence，不保存值。

### 5. 验证与路由

运行 validator 并重读工件。全局 inventory-only 在快照完整且 audit profile 有效时将 phase 设为 assessment，路由 `<Path>{roots.workflows}/ops/E-execute-and-stabilize/E-execute-and-stabilize.md</Path>` 的 verification-only 分支。项目部署或全局 mutation 只有 deployment model 与 target profile 都 Ready 才进入 `<Path>{roots.workflows}/ops/P-plan-and-approve/P-plan-and-approve.md</Path>`；blocking unknown 保持 blocked，并一次列出 owner 和所需决定。

## 完成标准

- scope/project/change tuple 唯一且与实际目录、全局索引一致；
- 项目身份不会因目录同名误合并，也不包含凭据；
- target profile v1 固定 operation mode、environment、deployment root、控制面身份、ownership 与差异分类；
- present/unknown 现场没有被误判为 fresh，mutation profile 已显式确认整体身份；
- 适用 collector 全部得到 observed/partial/unavailable/denied/failed 结论；
- 项目评估穷尽实际部署入口且未把推断伪装为观测；
- 未发生构建、安装、目标写入或外部 mutation；
- validator 通过并返回唯一下一路由。

## 子文件引用

- 状态与请求模板：`<Path>{roots.workflows}/ops/I-intake-and-assess/change-status-template.json</Path>`、`<Path>{roots.workflows}/ops/I-intake-and-assess/global-change-status-template.json</Path>`、`<Path>{roots.workflows}/ops/I-intake-and-assess/request-template.md</Path>`
- 盘点分支：`<Path>{roots.workflows}/ops/I-intake-and-assess/collector-catalog.md</Path>`、`<Path>{roots.workflows}/ops/I-intake-and-assess/system-report-template.md</Path>`
- 项目分支：`<Path>{roots.workflows}/ops/I-intake-and-assess/project-detection.md</Path>`、`<Path>{roots.workflows}/ops/I-intake-and-assess/deployment-dossier-template.md</Path>`
- Target profile：`<Path>{roots.workflows}/ops/I-intake-and-assess/target-profile-template.json</Path>`、`<Path>{roots.workflows}/ops/common/schemas/target-profile.schema.json</Path>`
