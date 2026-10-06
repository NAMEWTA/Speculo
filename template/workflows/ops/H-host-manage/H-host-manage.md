---
id: ops/host-manage
type: workflow-entry
workflow: ops
name: 服务器环境与治理
description: 只维护一个明确服务器的系统基线、Docker 和主机级入口，不把系统配置误路由到项目。
keywords: [ops, host-manage, 服务器, 持久化, 明确范围]
---

# 服务器环境与治理

激活后读取 `<Path>{roots.workflows}/ops/README.md</Path>` 与 `<Path>{roots.workflows}/ops/common/rules/activation-and-memory.md</Path>`。输入是一个明确的 local/SSH host_id（用户侧 server_id）；只维护系统环境，不从当前目录推断项目或扩大部署范围。

## 预检与选分支

定位最近盘点与当前问题证据。未登记或 SSH 接入未验证时转 `<Path>{roots.workflows}/ops/S-server-connect/S-server-connect.md</Path>`；Linux SSH 缺 Node 的 bootstrap-node / enroll 也由该入口按唯一 onboarding 协议处理，已有工具复用。

计划、执行或恢复前必须读取 `<Path>{roots.workflows}/ops/common/rules/workspace-and-authorization.md</Path>`、`<Path>{roots.workflows}/ops/common/rules/persistence-and-secrets.md</Path>` 和 `<Path>{roots.workflows}/ops/common/rules/recovery.md</Path>`。按本次 profile 读取 `<Path>{roots.workflows}/ops/H-host-manage/references/host-profiles.md</Path>` 的工具环境、Docker/镜像源、资源清理或系统控制/入口章节。

## 计划与执行

明确受影响消费者 `acknowledged_consumers`；任务还需列 `related_project_ids` 与相关 server_ids。计划包含下载、系统控制文件、服务重启、默认恢复、持久化和验证。影响项目布局/双边文档时先读 `<Path>{roots.workflows}/ops/common/rules/deployment-layout.md</Path>`；共享服务消费者再读 `<Path>{roots.workflows}/ops/common/rules/shared-services.md</Path>`。

通过 `<Path>{roots.workflows}/ops/common/tools/ops.mjs</Path>` 执行已确认任务，或原单计划精确批准，不直接拼接绕过网关的修改命令。不擅改 shell profile、删旧环境或清未知进程/数据。系统控制文件仅有计划内精确例外，业务数据不享有该例外；生成器负责的文档和知识投影不手写覆盖。

## 验收与恢复

执行需求对应的 server-check profile，保留未测项与实际失败；检查不代替双边回执或 APP 业务健康。成功刷新主机双边记录并转 `<Path>{roots.workflows}/ops/V-inventory-view/V-inventory-view.md</Path>` 更新清单。

缺权限/输入、漂移、锁或 failed/unknown 时按恢复合同停止受影响步骤，保留原 Run 和现场，不以新 task 绕过未知动作。返回目标、实际修改、检查/回执、未完成项和恢复路径；不把视图失败当作重跑业务的理由。
