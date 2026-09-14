# 官方资料核验登记册

## 资料状态与证据等级

**以下是供实际执行时查证的官方入口，不是本次已阅读的网页文献。** 本次环境网页搜索不可用，GitHub 仓库文件亦未取得。访问时间和发布时间均未知；没有进行链接存活、页面内容、最新版本支持或跨来源交叉验证。不得把此文件改写成“已经全面联网调研”。

本包的自动行为是保守的工程实现：本地元数据采集、保护规则、逐项审批、少数缓存隔离和恢复。参考文档中的工具行为是待本机版本核验的知识与建议，不是保证适用于所有版本的当前事实。路径默认值均为线索；工具真实配置优先于默认值假设。

执行时优先看供应商当前文档及本机帮助，记录产品、版本、操作系统、体系结构、访问时间、适用命令与结论；仓库 wrapper、插件、实验性功能和不同主版本分开核实。固定版本页面仅证明该页面对应版本的说明，不代表当前最新版本。

| ID | 发布者 | 官方入口 | 需要核实的内容 | 本次状态 |
| --- | --- | --- | --- | --- |
| <a id="mav-1"></a>MAV-1 | Apache Maven | [Settings Reference](https://maven.apache.org/settings.html) | localRepository、用户/全局 settings 与私有仓库配置保护 | 未在线访问 / 未核验 |
| <a id="mav-2"></a>MAV-2 | Apache Maven | [Maven Wrapper](https://maven.apache.org/wrapper/) | 项目 wrapper、自行下载和版本固定，不能按普通 mvn 二进制对待 | 未在线访问 / 未核验 |
| <a id="grd-1"></a>GRD-1 | Gradle | [Directory Layout](https://docs.gradle.org/current/userguide/directory_layout.html) | Gradle User Home 不是纯缓存，daemon/wrapper/config 分开 | 未在线访问 / 未核验 |
| <a id="npm-1"></a>NPM-1 | npm | [npm cache](https://docs.npmjs.com/cli/v10/commands/npm-cache) | cache verify/clean 的版本、完整性、自修复与 force 语义；v10 页面不代表本机版本 | 未在线访问 / 未核验 |
| <a id="npm-2"></a>NPM-2 | npm | [Folders](https://docs.npmjs.com/cli/v10/configuring-npm/folders) | prefix、全局安装和 cache 的区别；以本机主版本文档复核 | 未在线访问 / 未核验 |
| <a id="pnp-1"></a>PNP-1 | pnpm | [pnpm store](https://pnpm.io/cli/store) | store path/status/prune 的本机可用性及离线影响 | 未在线访问 / 未核验 |
| <a id="pnp-2"></a>PNP-2 | pnpm | [Settings](https://pnpm.io/settings) | store-dir、PNPM_HOME、虚拟 store 与卷/硬链接关系 | 未在线访问 / 未核验 |
| <a id="nvm-1"></a>NVM-1 | nvm project | [nvm README](https://github.com/nvm-sh/nvm) | 函数型管理器、每版本全局包、npm prefix 冲突、与 nvm-windows 不同 | 未在线访问 / 未核验 |
| <a id="nvw-1"></a>NVW-1 | nvm-windows project | [nvm-windows README](https://github.com/coreybutler/nvm-windows) | NVM_HOME、NVM_SYMLINK、原生 Windows 安装与联接语义 | 未在线访问 / 未核验 |
| <a id="fnm-1"></a>FNM-1 | fnm project | [fnm README](https://github.com/Schniz/fnm) | shell 激活、会话路径、版本目录与本机支持 | 未在线访问 / 未核验 |
| <a id="vol-1"></a>VOL-1 | Volta | [Understanding Volta](https://docs.volta.sh/guide/understanding) | toolchain/shim/项目 pin 与全局工具隔离 | 未在线访问 / 未核验 |
| <a id="mis-1"></a>MIS-1 | mise | [Directories](https://mise.jdx.dev/directories.html) | 数据、配置、缓存目录变量；必须核对当前版本和 Windows 支持边界 | 未在线访问 / 未核验 |
| <a id="asd-1"></a>ASD-1 | asdf | [Configuration](https://asdf-vm.com/manage/configuration.html) | 数据目录、shims、配置和版本切换；实现版本差异 | 未在线访问 / 未核验 |
| <a id="sdk-1"></a>SDK-1 | SDKMAN! | [Usage](https://sdkman.io/usage) | JDK candidate 管理、默认/当前选择与平台支持 | 未在线访问 / 未核验 |
| <a id="go-1"></a>GO-1 | Go project | [Command go](https://go.dev/cmd/go/) | go env、go clean、GOCACHE、GOMODCACHE、GOPATH、GOENV | 未在线访问 / 未核验 |
| <a id="go-2"></a>GO-2 | Go project | [Go Toolchains](https://go.dev/doc/toolchain) | 项目 toolchain、GOTOOLCHAIN 与查询/构建触发下载的可能性 | 未在线访问 / 未核验 |
| <a id="rus-1"></a>RUS-1 | Rust project | [Cargo Home](https://doc.rust-lang.org/cargo/guide/cargo-home.html) | Cargo Home 的 bin、config、credentials、registry、git，不当成单一缓存 | 未在线访问 / 未核验 |
| <a id="rus-2"></a>RUS-2 | Rust project | [rustup Environment Variables](https://rust-lang.github.io/rustup/environment-variables.html) | RUSTUP_HOME、CARGO_HOME 和工具链环境 | 未在线访问 / 未核验 |
| <a id="rus-3"></a>RUS-3 | Rust project | [cargo clean](https://doc.rust-lang.org/cargo/commands/cargo-clean.html) | 项目构建产物清理，不等于清理全部 Cargo Home | 未在线访问 / 未核验 |
| <a id="uv-1"></a>UV-1 | Astral | [uv Cache](https://docs.astral.sh/uv/concepts/cache/) | cache clean/prune、缓存安全与原生命令选择 | 未在线访问 / 未核验 |
| <a id="uv-2"></a>UV-2 | Astral | [uv Storage](https://docs.astral.sh/uv/reference/storage/) | 缓存、工具、受管 Python、配置位置与变量支持 | 未在线访问 / 未核验 |
| <a id="uv-3"></a>UV-3 | Astral | [uv Environment Variables](https://docs.astral.sh/uv/reference/environment/) | UV_CACHE_DIR 等变量按实际版本核验 | 未在线访问 / 未核验 |
| <a id="pip-1"></a>PIP-1 | PyPA | [pip cache](https://pip.pypa.io/en/stable/cli/pip_cache/) | pip cache dir/info/purge 的本机支持、下载与 wheel 缓存 | 未在线访问 / 未核验 |
| <a id="py-1"></a>PY-1 | Python | [venv](https://docs.python.org/3/library/venv.html) | 虚拟环境中的绝对路径与不可普遍重定位性 | 未在线访问 / 未核验 |
| <a id="git-1"></a>GIT-1 | Git project | [git status](https://git-scm.com/docs/git-status) | 未提交状态只是仓库保全的一部分，不能替代未推送/分支检查 | 未在线访问 / 未核验 |
| <a id="git-2"></a>GIT-2 | Git project | [git worktree](https://git-scm.com/docs/git-worktree) | worktree 关联、gitfile 和原生 prune/remove 规则 | 未在线访问 / 未核验 |
| <a id="git-3"></a>GIT-3 | Git project | [git clean](https://git-scm.com/docs/git-clean) | 预览与删除含义；忽略文件也可能是重要数据，禁止默认 -fdx | 未在线访问 / 未核验 |
| <a id="win-1"></a>WIN-1 | Microsoft | [Free up drive space in Windows](https://support.microsoft.com/windows/free-up-drive-space-in-windows-85529ccb-c365-490d-b548-831022bc9b32) | 存储设置、临时文件和系统清理入口 | 未在线访问 / 未核验 |
| <a id="win-2"></a>WIN-2 | Microsoft Learn | [Clean Up the WinSxS Folder](https://learn.microsoft.com/windows-hardware/manufacture/desktop/clean-up-the-winsxs-folder) | 原生组件存储维护，不能直接删除 WinSxS | 未在线访问 / 未核验 |
| <a id="win-3"></a>WIN-3 | Microsoft Learn | [winget uninstall](https://learn.microsoft.com/windows/package-manager/winget/uninstall) | 精确 ID、来源和卸载命令，不按模糊名称匹配 | 未在线访问 / 未核验 |
| <a id="win-4"></a>WIN-4 | Microsoft Learn | [setx](https://learn.microsoft.com/windows-server/administration/windows-commands/setx) | 持久化变量写入与展开/长度等风险，不用于盲目覆盖 PATH | 未在线访问 / 未核验 |
| <a id="win-5"></a>WIN-5 | Microsoft Learn | [Powercfg command-line options](https://learn.microsoft.com/windows-hardware/design/device-experiences/powercfg-command-line-options) | 休眠与电源配置是功能取舍，不是默认性能优化 | 未在线访问 / 未核验 |
| <a id="win-6"></a>WIN-6 | Microsoft Learn | [Manage WSL disk space](https://learn.microsoft.com/windows/wsl/disk-space) | WSL 虚拟磁盘空间与宿主缓存不同，禁止直接删除 ext4.vhdx | 未在线访问 / 未核验 |
| <a id="mac-1"></a>MAC-1 | Apple | [Free up storage space on Mac](https://support.apple.com/guide/mac-help/free-up-storage-space-mh17179/mac) | 系统存储管理、可清理与可回收空间概念 | 未在线访问 / 未核验 |
| <a id="mac-2"></a>MAC-2 | Apple | [Uninstall apps on Mac](https://support.apple.com/guide/mac-help/uninstall-apps-mh35835/mac) | 应用卸载入口、官方卸载器与个人数据 | 未在线访问 / 未核验 |
| <a id="mac-3"></a>MAC-3 | Apple | [Manage login items on Mac](https://support.apple.com/guide/mac-help/manage-login-items-open-automatically-mh15189/mac) | 登录/后台项目状态，不只看 LaunchAgents 文件 | 未在线访问 / 未核验 |
| <a id="brw-1"></a>BRW-1 | Homebrew | [Manpage](https://docs.brew.sh/Manpage) | cleanup、autoremove、uninstall、cask zap 的版本与破坏性差异 | 未在线访问 / 未核验 |
| <a id="dck-1"></a>DCK-1 | Docker | [Prune unused Docker objects](https://docs.docker.com/engine/manage-resources/pruning/) | 容器卷、镜像和构建缓存不同；禁用默认 system prune --volumes | 未在线访问 / 未核验 |
| <a id="xdg-1"></a>XDG-1 | freedesktop.org | [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/latest/) | Linux 数据、配置、缓存、状态目录语义；统一 DevRoot 是工程选择，不是替代标准 | 未在线访问 / 未核验 |
| <a id="apt-1"></a>APT-1 | Debian | [apt-get manual](https://manpages.debian.org/apt-get) | clean/autoclean/autoremove 模拟和依赖差异，按发行版版本验证 | 未在线访问 / 未核验 |

## 引用规则

其他参考文件使用这些 ID 指向待核验来源。真实检测报告中的路径、容量、应用清单等事实，应引用本次采集字段和时间，而非用网页作为本机事实的证据。涉及删除、数据保留、命令支持或系统优化时，本机验证不足必须停止自动操作并保留人工步骤。

`source-register.json` 是同一登记册的机器可读版本。全部 `verified=false`，禁止在没有实际查阅记录时批量改为 true。
