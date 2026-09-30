---
id: ops/server-connect
type: workflow-entry
workflow: ops
name: 服务器接入与登记
description: 处理指定服务器的可信 SSH、公钥认证、机器身份与接入检查，不部署项目或隐式改写 sshd。
keywords: [ops, server-connect, 服务器, 持久化, 明确范围]
---

# 服务器接入与登记

激活本 Work 后先读取 `<Path>{roots.workflows}/ops/README.md</Path>`。

## 读取范围

读取 `<Path>{roots.workflows}/ops/common/rules/activation-and-memory.md</Path>` 与 `<Path>{roots.workflows}/ops/common/rules/workspace-and-authorization.md</Path>`，按当前服务器/项目/部署/任务 ID 定位最小证据。只因冲突、unknown、权限或迁移安全需要扩读，不默认遍历全域明文。

## 流程与完成标准

必读 `<Path>{roots.workflows}/ops/common/rules/server-onboarding.md</Path>`。输入为明确 server_id、真实地址/端口、远端账号、已验证主机指纹、私钥/agent 来源与专用 host.root；已有信息直接复用，不重复问确认。

按可信接入 → 必要的固定 Node 引导 → enroll/盘点 → server-check base 的顺序执行。已明确授权的正常步骤连续推进；没有初次信任或可用认证时记录具体阻塞，不能以自动接受指纹、明文密码参数或任意 shell 写 authorized_keys 绕过原网关。

新增 records/servers/ID/checks 只由 server-check 写入，不手工补 pass。完成产物为 status.hosts 资源、原 inventory、接入检查回执及缺口清单；登记成功不等于接入成功，base-ready 不等于可部署所有项目。

服务器接入完成后：系统环境用 H，项目部署用 D，列表与查看用 V。不从用户当前项目目录推断部署目标，不将控制端自动登记为目标机器。

命令合同：`<Path>{roots.workflows}/ops/common/USAGE.md</Path>` 与 `<Path>{roots.workflows}/ops/common/WORKSPACE-USAGE.md</Path>`；执行只通过现有 ops.mjs 网关及明确新增的任务命令，不绕过授权直接拼接目标修改命令。
