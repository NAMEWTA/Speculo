# 复用已有运行时

用于“工具已经安装，但 VS Code 找不到、另行下载或选错版本”。先解释差异来自哪里，再选择设置；不要整段复制路径模板。

## 盘点入口与环境

记录所需工具的入口、解析后位置、版本、架构、选择机制及适用项目。POSIX 使用 `command -v` / `type -a`，PowerShell 使用 `Get-Command -All`；版本命令也要在目标环境执行。不要输出完整环境变量或配置文件中的秘密。

| 环境 | 核对内容 |
| --- | --- |
| 普通 shell / SSH shell | 交互、登录与非交互启动行为；已有 PATH、版本管理器和包装脚本 |
| 桌面 / Remote 扩展宿主 | 启动时的环境及扩展专用路径设置；GUI 启动不保证等同 shell |
| 集成终端 | 默认 shell、启动参数、`terminal.integrated.env.<平台>` 的覆盖及 PATH 顺序 |
| 构建 / 语言服务 / 调试器 | 实际工具入口、工作目录及各自环境覆盖；终端正确不代表这些进程正确 |

保留已存在的项目感知包装脚本和版本管理器。检查 `.sdkmanrc`、`.nvmrc`、`.node-version`、`package.json` 的版本声明、Go 的 `go.mod`/`go.work`、Java 构建配置等实际使用的机制；读取声明不等于允许执行项目脚本。先在普通目录和一个已知特例目录比较结果，再考虑显式路径。

最小修复应落在造成差异的作用域。不要为 VS Code 问题改系统 alternatives、全局 PATH 或包管理器配置。集成终端 PATH 不用于假装修复扩展宿主；确需重启/重连时说明影响，避免强杀用户会话。

## Java：语言服务器与项目 JDK 分开

- 从**已安装版本**的 `redhat.java` 清单、发行说明和运行日志确定语言服务器要求。官网默认分支可能已升级要求，不能把当前官网的最低 JDK 套到所有旧版本，也不能固定为某个 JDK 大版本。
- 需要显式复用已有兼容 JDK 时，核对 `java.jdt.ls.java.home` 支持情况，填 JDK 根目录，不填 `bin/java`。扩展自带 JRE 是语言服务运行时，不是项目 JDK；不删除其内部文件来“去重”。
- `java.configuration.runtimes` 按执行环境名称合并已有映射，保留多版本；只在确需默认 JDK 时设置一个 `default`。该默认项主要用于无构建工具的文件夹，不能覆盖 Maven/Gradle 项目约定。
- 版本存在后再验证最小 `javac`/`java` 样例与扩展补全。没有兼容 JDK 时报告差距，按用户范围选择兼容扩展或另行安排运行时安装，不自动升级系统 Java。

## Maven：复用入口，保留项目策略

检查 `maven.executable.path`、`maven.executable.preferMavenWrapper` 和现有 Maven/JDK 选择入口。用户明确要系统已有 Maven 时才按该策略配置；项目本来使用 Wrapper 时保留。Wrapper 本身、Maven 发行版和项目依赖下载是不同事情，不承诺“配置完成后绝不下载”。

绝对路径若绕过项目感知的 `mvn` 包装脚本，可能导致特例项目选错 JDK。检查已安装扩展支持的 `maven.terminal.useJavaHome` / `maven.terminal.customEnv` 等覆盖，不让语言服务器的 JDK 无意变成所有项目的 `JAVA_HOME`。比较普通目录和特例目录的 `mvn -version`，再验证 VS Code 的 Maven 入口；不要为了验收运行未知 `verify`、发布目标或业务脚本。

## Node、Python 与前端

Node 复用已有 Volta/nvm/asdf 等选择机制，检查 shim/包装脚本与真实二进制的 PATH 优先级；不要一律固定到最新 Node。核对实际 `node -v`、`process.execPath` 以及调试配置的 `runtimeExecutable`/`runtimeVersion`/工作目录。不要把 VS Code/扩展宿主自带的 Node 替换成项目 Node。依赖安装和生命周期脚本不属于自动配置 Profile 的默认步骤。

Python 保留工作区已选解释器和虚拟环境。`python.defaultInterpreterPath` 是候选默认入口，已有工作区选择不会因改这一键必然重置；通过解释器选择 UI 和实际 `sys.executable` 读回。项目里的 `.venv` 不写成跨主机通用的绝对路径。

Vue/React 复用内置 JS/TS 能力及项目已有依赖；`typescript.tsdk` 需要工作区 TypeScript 时放在对应项目作用域，不在所有 Profile 固定一个项目的 `node_modules`。不因补编辑器扩展擅自改 `package.json`、lint 规则或锁文件。

## Go：区分运行时、语言服务与调试工具

1. 核对 `go version`、`go env GOROOT GOPATH GOTOOLCHAIN`、`gopls version`；需要调试再检查 `dlv version`。路径存在不代表架构、执行权限或版本兼容。
2. 检查当前扩展对 `go.alternateTools`、`go.goroot`、`go.toolsEnvVars` 的支持。需要时仅补相应工具入口，不无条件重置 GOROOT/GOPATH。
3. 用户要求复用和避免隐式更新时，检查 `go.toolsManagement.autoUpdate` 与 `go.toolsManagement.checkForUpdates`。支持时可关闭自动更新并使用 `local` 检查本地最低要求；不以关闭所有检查掩盖不兼容。
4. `GOTOOLCHAIN=local` 只在明确不允许自动下载 toolchain 的范围采用，例如扩展工具环境；项目要求更高 Go 时报告不兼容，不强设系统全局值或悄悄下载新 Go。
5. 现代 gopls 已集成 staticcheck 分析；不默认再设置 `go.lintTool: staticcheck`。已有独立 lint 需求保留，仅在确认重复/缺失导致问题且在授权范围内时移除该键。
6. 缺失 gopls/Delve 时先选支持现有 Go、OS、架构的版本，按已授权范围安装。`go install` 也可能下载或升级 toolchain，不能盲用 `@latest`。官方预编译包需核对来源、目标平台、可用的官方摘要/签名，再做版本及功能检查；网络失败不通过关闭 TLS 或修改全局代理解决。

## 依据与时效

2026-10-14 亲自读取的官方入口：[Java 项目 JDK 配置](https://code.visualstudio.com/docs/java/java-project)、[Java 扩展要求](https://github.com/redhat-developer/vscode-java#requirements)、[Maven 扩展](https://github.com/microsoft/vscode-maven)、[Go 扩展设置](https://github.com/golang/vscode-go/wiki/settings)、[Python 解释器设置](https://code.visualstudio.com/docs/python/settings-reference)、[Node 调试](https://code.visualstudio.com/docs/nodejs/nodejs-debugging)。这些页面会变化；现场记录扩展版本及其 `package.json` 的设置 schema，版本相关结论以该已安装版本为范围。
