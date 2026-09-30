---
id: ops/project-deploy
type: workflow-entry
workflow: ops
name: 项目与共享服务部署
description: 固定一个项目及目标服务器，配置项目容器、依赖、升级与双边文档，不隐式取得整台服务器的维护权限。
keywords: [ops, project-deploy, 项目, 持久化, 明确范围]
---

# 项目与共享服务部署

激活本 Work 后先读取 `<Path>{roots.workflows}/ops/README.md</Path>`。

## 读取范围

读取 `<Path>{roots.workflows}/ops/common/rules/activation-and-memory.md</Path>` 与 `<Path>{roots.workflows}/ops/common/rules/workspace-and-authorization.md</Path>`，按当前服务器/项目/部署/任务 ID 定位最小证据。只因冲突、unknown、权限或迁移安全需要扩读，不默认遍历全域明文。

## 流程与完成标准

先固定 project_id、显式 server_ids、环境和实例；公共 MySQL/Redis/MinIO 作为 shared-service 项目，Host.host_services 里的 Nginx/WireGuard 不伪装成项目。服务器缺接入走 S，缺系统基线走 H；已明确授权的前置 H/D specs 可组成同一 task 顺序执行，不重复确认。

从用户指定的本地路径或固定 Git commit 读取实际清单；analyze 不执行仓库代码。网络获取源码必须用户允许并固定完整提交，不用浮动 main/tag。修改来源版本用 resource_updates 写进新计划，而非伪造旧部署的源码版本。任务执行所用本地构件/脚本放入 input_paths 冻结，编译器新发现的未审阅输入必须停止。

识别项目真实启动、构建、所有持久化参数、环境变量、迁移、健康检查及恢复能力。不能仅生成通用 Compose 后声称完成。选择专用、shared、external 依赖：优先遵循用户指定 provider，多候选不得随机选择。MySQL/Redis/MinIO 按显式逻辑资源与应用账号分配；未知 lauctric 保留原名，需要真实仓库/版本和经验证的适配规则，不猜产品。

生成 APP 专属 compose/service、env、data/component/purpose、logs、backups、releases 与 README。公共服务独立同级，不向 APP 复制其物理数据。APP 副本可以使用同一 allocation；不同 APP 默认不同逻辑数据与凭据。跨 Compose/主机依赖由 Binding 与执行序列管理，不能使用跨文件 depends_on 冒充协调。

完整 plan 明示持久化映射、来源和构件摘要、执行顺序、账号版本、网络、受影响消费者、数据库迁移单一执行者、备份与恢复限制。新装或现有 provider 均先准备并验证，再分配逻辑资源，再部署消费者。跨主机失败停止后续，逐主机保留事实，不假装全局事务。

已确认任务按 workspace-and-authorization.md 连续执行；未采用任务授权时仍须精确单计划批准。upgrade/rollback 使用新的明确版本和新计划，不把旧授权或数据回滚隐含继承。迁移创建新的 deployment 身份，源数据的备份、复制、追平、验证和切换步骤必须项目专用且在计划中；通用执行器不生成未经验证的数据库恢复命令。

uninstall 只停止自身、退役绑定和实例，保留所有数据、账号、公共服务和共享网络。删除逻辑业务数据不是默认能力。

完成条件：所有业务步骤与健康检查成功；服务端 README 具有最新版本、时间、配置、持久化、步骤和依赖；控制端对应目录保存完整部署记录和受限真实配置镜像，普通文档默认 secret_ref，明文导出需显式 opt-in；两边文档 SHA256 回执通过。docs_pending 不得报全部完成。最后执行 V 更新项目→服务器与服务器→项目清单。

命令合同：`<Path>{roots.workflows}/ops/common/USAGE.md</Path>` 与 `<Path>{roots.workflows}/ops/common/WORKSPACE-USAGE.md</Path>`；执行只通过现有 ops.mjs 网关及明确新增的任务命令，不绕过授权直接拼接目标修改命令。
