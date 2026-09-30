---
id: ops/initialize
type: workflow-entry
workflow: ops
name: 控制端初始化
description: 仅准备发起任务的控制端，建立受限状态根与本机工具证据，不默认登记部署服务器。
keywords: [ops, initialize, 控制端, 持久化, 明确范围]
---

# 控制端初始化

激活本 Work 后先读取 `<Path>{roots.workflows}/ops/README.md</Path>`。

## 读取范围

读取 `<Path>{roots.workflows}/ops/common/rules/activation-and-memory.md</Path>` 与 `<Path>{roots.workflows}/ops/common/rules/workspace-and-authorization.md</Path>`，按当前服务器/项目/部署/任务 ID 定位最小证据。只因冲突、unknown、权限或迁移安全需要扩读，不默认遍历全域明文。

## 流程与完成标准

先只读识别 shell、SSH、Git、Node、uv、JDK 和权限；已有且满足要求的工具复用。控制端执行器是 Node；bootstrap 的 probe 只做检测。用户提供带 SHA256 的可信安装器并确认后才执行引导。安装器完整命令/作用范围必须先展示。

使用 init 创建控制端身份与绝对 state 根，记录当前工具版本；不会顺便连接远端或清理当前机器。服务器 README 默认不含密码、服务器 OPERATIONS 启用、控制端受限账本、严格 Docker data-root 都是默认合同。新文档只含 secret_ref，明文交付必须显式 opt-in；真实 env/配置镜像仍受限保存。

只按用户已指定的服务器与项目登记，不编造身份、用户名、旧密码或工具版本。控制端需要作为部署目标时必须另外明确登记 local Host，不能把“本机准备”自动变成项目配置。初始化系统软件需要原 I/H 的完整 spec/plan；缺少管理员权限就报告阻塞，不绕过 sudo。

完成条件：控制端状态有效、目录权限受限、工具盘点有证据，后续入口可以独立运行。未具备的服务器能力明确列为缺口。下一步接入服务器用 S，查看已登记资产用 V。

命令合同：`<Path>{roots.workflows}/ops/common/USAGE.md</Path>` 与 `<Path>{roots.workflows}/ops/common/WORKSPACE-USAGE.md</Path>`；执行只通过现有 ops.mjs 网关及明确新增的任务命令，不绕过授权直接拼接目标修改命令。
