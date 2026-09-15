---
id: ops/initialize
type: workflow-entry
workflow: ops
name: 控制端初始化
description: 识别部署机工具与能力，建立资源账本、路径和明文记录规则。
keywords: [ops, initialize, 主机, 持久化, 审批]
---

# 控制端初始化

激活本 Work 后先读取 `<Path>{roots.workflows}/ops/README.md</Path>`。

## 读取范围

读取 `<Path>{roots.workflows}/ops/common/rules/activation-and-memory.md</Path>`，按当前主机/项目/部署 ID 定位最小证据。只因冲突、unknown、权限或迁移安全需要扩读，不默认遍历全域明文。

## 流程与完成标准

先只读识别 shell、SSH、Git、Node、uv、JDK 和权限；已有且满足要求的工具复用。控制端执行器是 Node；bootstrap 的 probe 只做检测。用户提供带 SHA256 的可信安装器并确认后才执行引导。安装器完整命令/作用范围必须先展示。

使用 init 创建控制端身份与绝对 state 根，记录当前工具版本；不会顺便连接远端或清理当前机器。host root 默认规范、服务器 README 不含密码、服务器 OPERATIONS 启用、控制端明文总册、严格 Docker data-root 都是默认合同。

只按用户已指定的主机与项目登记，不编造身份、用户名、旧密码或工具版本。初始化系统软件需要 I/H 的完整 spec/plan；缺少管理员权限就报告阻塞，不绕过 sudo。

完成条件：控制端状态有效、目录权限受限、工具盘点有证据，后续入口可以独立运行。部署端未准备好的能力明确列为缺口。

命令合同：`<Path>{roots.workflows}/ops/common/USAGE.md</Path>`；所有执行通过 ops.mjs，不能绕过计划审批直接拼接命令调用主机。
