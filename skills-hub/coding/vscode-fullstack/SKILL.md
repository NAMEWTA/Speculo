---
name: vscode-fullstack
description: 配置或排查 VS Code 的本机与 Remote SSH/WSL/Container Profile、扩展和语言工具链发现，复用已有开发环境。
license: MIT
---

# VS Code 全栈开发环境

让目标窗口、扩展宿主和项目使用正确的开发工具，同时保留用户定制。先确定是整理一个 Profile、统一多端，还是排查某个语言功能；按范围处理，不把“整理”推导成批量删除。

## 定位真正生效的位置

区分客户端、运行代码的主机、Profile、Remote Settings 和 Workspace/Folder 设置。Stable、Insiders、便携版、容器和 SSH Server 的目录可能不同，使用活动实例确认，不能拿第一个同名目录当目标。

从本机 CLI/UI、已安装扩展清单和有效设置建立差异。设置文件不存在可以是正常初始状态；同名 Profile 也不代表已同步。多端或默认 Profile 调整读 [作用域与验收](references/profiles-and-validation.md)。

## 按问题进入专项方法

| 现象 | 重点方法 |
| --- | --- |
| shell 能用，编辑器找不到或重复下载运行时 | [运行时复用](references/runtime-reuse.md)：比较 shell、扩展宿主、集成终端、构建和调试入口 |
| Java/Maven 选错 JDK、Go/Python/Node 版本不一致 | 同一参考：保留项目 Wrapper、版本管理器和虚拟环境 |
| 补语言支持或 formatter/lint 冲突 | [扩展与设置](references/extensions-and-settings.md)：按功能选择兼容成员，检查真实冲突 |
| 桌面可用但 Remote 不工作 | [Profile 与验收](references/profiles-and-validation.md)：核对安装位置、启用状态和远端生效值 |

Java 语言服务运行时与项目 JDK 分开判断；Python 默认入口不一定覆盖已有工作区解释器；Go 的 runtime、gopls 和 Delve 各有版本要求；项目 Node 与编辑器内部 Node 也不同。不要用统一绝对路径抹掉项目选择机制。

## 修改配置和扩展

选择能修复差异的最小作用域。只补本次缺少的能力，保留 formatter、禁用项、片段、项目 Wrapper 和既有版本。必要辅助工具按兼容性补齐，不能隐式升级系统语言运行时。

写前保存相关原件与扩展/Profile 状态。按 JSONC 增量编辑保留注释、尾逗号和无关键；对象按键合并，数组按其语义处理，PATH 这类有序设置不能当集合排序。

通过产品支持的 CLI/UI 创建、选择和关联 Profile、安装扩展。安装后重新读取版本、启用状态及必要依赖；仅复制扩展目录或改内部数据库不能代表有效安装。

并发编辑时重新合并差异。权限、来源或版本不明只阻塞相关修改，继续可完成的独立部分；不要关闭 Workspace Trust、签名或 TLS 来掩盖问题。

## 验证真实使用

按改变的功能选最小样例：配置读回、实际解释器/编译器入口、补全与诊断、格式化或调试，以及需要的 Remote 会话。已经格式化的文件没有 edits 不代表 formatter 失效，旧日志也不能替代新复现。

区分命令行、隔离编辑器和用户实际窗口的验证结果。客户端不可达时交付准确操作步骤和待验收项，不能声称远程环境已可用。

报告具体修改位置、保留的项目特例、实际检查和本轮恢复方法。只恢复本轮改动，不能覆盖后续用户编辑。
