---
name: vscode-fullstack
description: 配置或排查 VS Code 本机及 Remote SSH/WSL/Container 的 Profile、扩展和语言工具链发现。
license: MIT
---

# VS Code 开发环境

让目标 Profile 与扩展宿主正确使用已有开发工具，保留项目版本选择和用户定制。
先确认实际客户端、执行代码的主机、Profile 和设置作用域。用户只配置一处就不扩大到全部；统一多端时先找出现有差异。

按问题读取：

- [运行时复用](references/runtime-reuse.md)：Java/Maven、Go、Node、Python 的现有入口与项目版本。
- [扩展与设置](references/extensions-and-settings.md)：语言扩展、Vue/React 和配置键。
- [Profile 与验收](references/profiles-and-validation.md)：本机/远程作用域、备份和真实功能检查。

先比较终端、扩展宿主与调试器实际使用的路径/版本，再决定修改；磁盘上存在一个工具不代表扩展会使用它。
只安装缺少且任务需要的能力。保留用户的 formatter、禁用项与项目 Wrapper，不默认升级运行时或重写系统环境。

修改配置前保存相关原件，使用 JSONC 支持的增量编辑保留注释和无关键。并发编辑时重新合并，不覆盖用户后续修改。
通过支持的 CLI/UI 管理 Profile 与扩展，不写内部数据库或复制扩展目录假装安装。权限或 Workspace Trust 阻挡时说明原因，不关闭信任、签名或 TLS 来通过检查。

检查实际涉及的补全、诊断、格式化或调试功能。命令行可用与真实 Remote 扩展运行分别说明；无法访问 GUI/远端时明确未验证范围。
交付修改位置、工具入口和结果，保留本轮备份供恢复。
