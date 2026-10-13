---
name: ops
description: "用于主机、项目部署、连接和资源盘点；发现与只读检查不授权远程变更。"
metadata:
  speculo-kind: domain-skill
  speculo-id: domain/ops
  speculo-domain: ops
  speculo-contract-version: "2"
---

# ops

## 发现与激活

只读发现不创建状态、不执行 Work、不取得写入授权。先按 ID/关键词定位相关能力和永久知识条目，再少量回读原文与 provenance。用户指定具体 Work 时直接进入该入口；不需要再次激活本领域。

明确进入本领域后读取 <Path>{roots.workflows}/ops/common/rules/activation-and-memory.md</Path> 与 <Path>{roots.workflows}/ops/common/rules/domain-runtime.md</Path>，解析 workspace，仅读取当前任务需要的状态、入口与分支参考。缺少输入、权限、有效 schema 或 owner 冲突时停止受影响分支并保留恢复证据。

## 能力路由

<!-- AUTO-INDEX-START -->

- **ops/project-deploy** — 项目与共享服务部署：<Path>{roots.workflows}/ops/ops-d-project-deploy/SKILL.md</Path>
- **ops/host-manage** — 服务器环境与治理：<Path>{roots.workflows}/ops/ops-h-host-manage/SKILL.md</Path>
- **ops/initialize** — 控制端初始化：<Path>{roots.workflows}/ops/ops-i-initialize/SKILL.md</Path>
- **ops/server-connect** — 服务器接入与登记：<Path>{roots.workflows}/ops/ops-s-server-connect/SKILL.md</Path>
- **ops/inventory-view** — 服务器与部署资产视图：<Path>{roots.workflows}/ops/ops-v-inventory-view/SKILL.md</Path>

<!-- AUTO-INDEX-END -->

## 永久知识

- <Path>{roots.state}/ops/knowledge/</Path>
- <Path>{roots.state}/ops/hosts/{host_id}/knowledge/</Path>
- <Path>{roots.state}/ops/projects/{project_id}/knowledge/</Path>

正式写入前检查原 owner/gateway、未闭合事务及恢复证据。读取索引不自动激活能力，未知网关只阻塞对应写入。
