---
id: ops/inventory-view
type: workflow-entry
workflow: ops
name: 服务器与部署资产视图
description: 从现有资源和检查证据生成简单 MD、标准 JSON 与离线 HTML，双向查看服务器与项目，不连接或修改目标。
keywords: [ops, inventory-view, 资产清单, 持久化, 明确范围]
---

# 服务器与部署资产视图

激活本 Work 后先读取 `<Path>{roots.workflows}/ops/README.md</Path>`。

## 读取范围

读取 `<Path>{roots.workflows}/ops/common/rules/activation-and-memory.md</Path>` 与 `<Path>{roots.workflows}/ops/common/rules/workspace-and-authorization.md</Path>`，按当前服务器/项目/部署/任务 ID 定位最小证据。只因冲突、unknown、权限或迁移安全需要扩读，不默认遍历全域明文。

## 流程与完成标准

必读 `<Path>{roots.workflows}/ops/common/rules/inventory-and-records.md</Path>`。输入为明确的已初始化 state 根，以及可选的检查过期阈值；服务器/项目筛选只影响浏览，不授予执行权。

通过 ops.mjs fleet 生成 state_root/FLEET.md 入口与 records/views/view-id/{inventory.json,FLEET.md,index.html,manifest.json}。HTML 使用 `<Path>{roots.workflows}/ops/common/templates/FLEET.html</Path>`，JSON 遵循 `<Path>{roots.workflows}/ops/common/schemas/fleet-view.schema.json</Path>`；不额外启动服务、安装依赖或访问 CDN。

产物由 fleet 独占生成，不手改投影；永不读取 private、env、server-files、任务规格或授权文本用于展示。服务器、项目、部署、主机级服务、外部依赖、任务及 Run 状态必须保留真实关系，desired 与 observed 版本分开，未测/过期/未知不改成正常。

完成条件：所有视图文件已读回匹配 manifest；FLEET.md 指向同一批次 HTML/JSON；没有 catalog 漂移或链接越界；提供本机可打开的实际路径。生成失败保留旧入口，只报告视图失败，不重跑业务，也不回写 status.json。

刷新视图是本地衍生记录操作，不需要每次再确认部署。要重新检查服务器时转 S/H 的明确只读 server-check；要改部署时转 D，新任务不能来自看板按钮。

命令合同：`<Path>{roots.workflows}/ops/common/USAGE.md</Path>` 与 `<Path>{roots.workflows}/ops/common/WORKSPACE-USAGE.md</Path>`；执行只通过现有 ops.mjs 网关及明确新增的任务命令，不绕过授权直接拼接目标修改命令。
