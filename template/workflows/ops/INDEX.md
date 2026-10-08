---
id: ops
type: workflow
workflow: ops
name: OPS 控制端、服务器与项目运维
description: 五类入口区分控制端、服务器接入、系统环境、项目部署和资产视图，任务内连续执行并保留摘要批准与双边回执。
keywords: [ops, 控制端, 服务器, SSH, 项目, 部署, Docker, 持久化, 公共服务, 资产清单, 运维]
---

# OPS 工作空间索引

本索引仅用于被动发现。用户明确激活 OPS 或指定 Work 后读取 `<Path>{roots.workflows}/ops/README.md</Path>`；被动读取不初始化、不连接服务器、不安装、不执行计划。

## Work 激活

激活后按当前任务读取 `<Path>{roots.workflows}/ops/common/rules/activation-and-memory.md</Path>`，再读取当前 Work 与必要规则；索引自身不授予执行或永久知识写入权限。

使用顺序为控制端初始化、指定 Host 初始化、Project 安排到明确 Host。首次 Host 的持久化根由用户选定，建议真实登录主目录下 ops；换账号后仍复用原根。

Controller 是发起任务的本机，Server 对应既有 Host.host_id；Project 是业务或共享服务，Deployment 连接项目、服务器、环境和实例。当前目录、上次服务器和浏览看板都不是隐含执行目标。

I-initialize：只准备控制端。
S-server-connect：指定服务器的可信 SSH 接入、身份登记、公钥认证和接入检查。
H-host-manage：指定服务器的系统运行环境与治理，不混入项目部署。
D-project-deploy：指定项目到明确服务器的部署、依赖、升级与迁移。
V-inventory-view：只生成本地 MD/JSON/离线 HTML，不连接服务器、不修改业务。

H/D 可在一次明确任务授权内按冻结规格连续执行，仍产生逐 Run 的摘要批准与双边证据。详细流程由激活合同负责，发现索引不授予权限。

## 永久知识

`<Path>{roots.state}/ops/knowledge/</Path>`：共享知识与验证日期。
`<Path>{roots.state}/ops/hosts/{host_id}/knowledge/</Path>`：服务器特有经验。
`<Path>{roots.state}/ops/projects/{project_id}/knowledge/</Path>`：项目通用约束。

知识不保存密码、不授予执行权限；运行事实在 status.json 与原始 Run/Release，集中任务/检查/视图在 records/，受限真实凭据在 private/。新 FLEET.md 是可再生成的阅读入口，不是资源写入网关。
