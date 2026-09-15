---
id: ops
type: workflow
workflow: ops
name: OPS 主机与 APP 运维
description: 三入口管理控制端初始化、主机环境与项目部署，APP 与公共服务同级持久化，批准后执行并核验双边文档。
keywords: [ops, 主机, SSH, 部署, Docker, 持久化, 公共服务, 运维]
---

# OPS 2.2 索引

本索引只用于被动发现。用户明确激活 OPS 或指定 Work 后读取 `<Path>{roots.workflows}/ops/README.md</Path>`；被动读取不初始化、不连接服务器、不安装、不执行计划。

激活后读取 `<Path>{roots.workflows}/ops/common/rules/activation-and-memory.md</Path>`。以稳定 host_id、project_id、deployment_id 定位，运行 ID 只用于审批和审计，不创建 change 业务分类。

## 永久知识

`<Path>{roots.state}/ops/knowledge/</Path>`：共享知识与验证日期。
`<Path>{roots.state}/ops/hosts/{host_id}/knowledge/</Path>`：主机特有经验。
`<Path>{roots.state}/ops/projects/{project_id}/knowledge/</Path>`：项目通用约束。

知识不保存密码，也不授予执行权限。运行事实、双边文档和明文凭据分别在资源账本、部署记录、private 账本中。

## Work 激活

I-initialize：控制端初始化。
H-host-manage：本地或远程主机的环境、诊断、清理和维护。
D-project-deploy：业务 APP 与公共服务部署、复用、更新、停止及显式迁移。

三个入口都使用 plan → approve → apply → verify → dual-documents；不得自动激活额外旧 Work。
