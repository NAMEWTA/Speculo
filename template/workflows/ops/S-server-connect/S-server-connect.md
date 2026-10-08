---
id: ops/server-connect
type: workflow-entry
workflow: ops
name: 服务器接入与登记
description: 处理指定服务器的可信 SSH、真实登录主目录探测、用户确认持久化根及接入登记，不部署项目或隐式改写 sshd。
keywords: [ops, server-connect, 服务器, 持久化, 明确范围]
---

# 服务器接入与登记

激活本 Work 后先读取 `<Path>{roots.workflows}/ops/README.md</Path>`。

## 读取范围

读取 `<Path>{roots.workflows}/ops/common/rules/activation-and-memory.md</Path>`，按当前 ID 定位最小证据。

## 流程与完成标准

必读 `<Path>{roots.workflows}/ops/common/rules/server-onboarding.md</Path>` 和 <Path>{roots.workflows}/ops/common/rules/host-root-and-onboarding.md</Path>。输入为明确 server_id、真实地址/端口、远端账号、已验证主机指纹及私钥/agent 来源；根在连接后识别主目录并由用户选定。已有明确指定直接记录，不重复问确认。

按 onboarding 唯一顺序推进：可信接入 → server-discover（不提权）→ 用户选定根 / server-root-confirm → 必要的固定 Node 引导 → enroll/盘点 → server-check base。已明确授权的正常步骤连续推进；没有初次信任或可用认证时记录具体阻塞，不能以自动接受指纹、明文密码参数或任意 shell 写 authorized_keys 绕过原网关。

新增 records/servers/ID/checks 只由 server-check 写入，不手工补 pass。完成产物为 status.hosts 资源、账号/根确认回执、原 inventory、接入检查回执及缺口清单；登记成功不等于接入成功，base-ready 不等于可部署所有项目。

服务器接入完成后：用户已要求服务器初始化则进入 H 的最小初始化；只要求接入则返回路由。更换账号通过 server-connection-spec 验证同机身份并保留原根，按 S 的精确计划批准更新连接。系统环境用 H，项目部署用 D，列表与查看用 V。不从用户当前项目目录推断部署目标，不将控制端自动登记为目标机器。

需要实际命令参数时，只查当前动作的合同：`<Path>{roots.workflows}/ops/common/USAGE.md</Path>` 与 `<Path>{roots.workflows}/ops/common/WORKSPACE-USAGE.md</Path>`；执行只通过现有 ops.mjs 网关及明确新增的任务命令，不绕过授权直接拼接目标修改命令。
