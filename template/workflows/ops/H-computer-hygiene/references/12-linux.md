# Linux 与 WSL 补充分支

本工作的主要系统专项是 Windows/macOS。Linux 脚本只提供通用开发环境、配置锚点、缓存、项目和下载资料盘点；没有完整系统包管理器、journal、systemd、容器或所有用户软件清单。明确记录这些缺口，不伪装成发行版级完整清理。

建议按 XDG 的配置、数据、缓存和状态语义组织路径。统一 DevRoot 可设为 `~/.local/share/dev`，但这是工程选择，不应无条件替换发行版与系统服务规定的路径。系统 Python、`/usr`、`/lib`、`/etc`、包数据库、内核和 initramfs 默认保护。用户态 JDK 与 Maven 优先用 SDKMAN!；发行版 `openjdk`/`maven` 包仍属系统包管理器，与 `~/.sdkman/candidates` 分开盘点，不要把两者 PATH 叠在一起当“同一个 Java”。[SDK-1](00-sources.md#sdk-1)、[XDG-1](00-sources.md#xdg-1)

apt/dnf/pacman 等按当前发行版帮助选择原生命令。缓存清理与删除孤立包不同；先做可用的模拟/列表检查，核对手动安装标记和依赖。不要自动执行 autoremove、删除旧内核或清空包数据库；没有支持的预览方法时必须明确说明。[APT-1](00-sources.md#apt-1)

journal 清理要核实诊断、审计和保留期，不能为了空间默认丢弃日志。Docker/Podman volumes、数据库、Kubernetes 数据、虚拟机磁盘和 systemd 用户服务默认保护，不能用 `system prune --volumes` 一次性代替身份检查。[DCK-1](00-sources.md#dck-1)

WSL 报告只代表该发行版。宿主 Windows PATH 注入、Windows 可执行文件、`/mnt/c`、Linux 原生 SDK 和虚拟磁盘是不同层级；项目和缓存是否位于宿主挂载卷须记录。WSL 内的 JDK/Maven 用该发行版里的 SDKMAN，不要把宿主 Windows JDK 或 `/mnt/c` 上的安装树当作 WSL 的 `JAVA_HOME`。释放 Linux 文件与缩小宿主 vhdx 不是同一个动作，后者按 Microsoft 的当前指导另行确认。[WIN-6](00-sources.md#win-6)

原生 Linux 验收应包含 shell/IDE 环境、真实文件系统的链接/挂载、系统包依赖和实际构建；本包 Linux 测试只证明隔离 fixture 的脚本行为。
