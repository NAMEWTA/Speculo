# macOS 专项检查与清理

**适用状态：按实际 macOS、CPU 架构和工具版本核验。** 本包未在线查阅最新文档，未在真实 macOS 验收。官方入口见 [MAC-1](00-sources.md#mac-1)、[MAC-2](00-sources.md#mac-2)、[MAC-3](00-sources.md#mac-3)、[BRW-1](00-sources.md#brw-1)。

## 默认采集

读取 `/Applications`、`~/Applications`、`/System/Applications` 的有限深度 app bundle 元数据，以及用户/第三方 LaunchAgents、LaunchDaemons 的 Label、程序首路径和文件是否存在。系统 app 标记为系统组件。不能由 plist 文件存在与否推断实际加载状态，也不读取完整参数或环境以避免凭据泄露。

默认不调用 launchctl、不枚举所有安装收据、不检查所有 SMAppService 登录/后台项目、不完整读取系统扩展、快照或其他用户。需要时通过系统设置和受支持工具补证据。Apple 的登录项管理不能只靠删除 LaunchAgents 文件替代。[MAC-3](00-sources.md#mac-3)

## 清理矩阵

| 对象 | 检查与处理 | 边界 |
| --- | --- | --- |
| `~/Library/Caches` | 逐应用、确认进程关闭，优先应用/工具原生命令 | 禁止 `rm -rf ~/Library/Caches/*`；缓存可能影响离线工作与会话 |
| `~/Library/Logs` | 检查时间、诊断/合规需求，保留近期故障证据 | 不把全部日志视为垃圾，不动系统审计 |
| Saved Application State | 区分窗口恢复、未完成任务和应用数据 | 用户确认后逐应用处理，非默认清空 |
| Downloads 安装 DMG/PKG/ZIP | 验证来源、已安装状态、备份与离线需求 | 不因文件老或大就删除 |
| `.Trash` | 是否需要恢复、外置卷垃圾篓 | 清空需单独确认 |
| Application Support / Containers / Group Containers | 应用身份、沙盒、共享组件、个人资料 | 不是缓存；禁止按应用名模糊匹配整树删除 |
| Homebrew 下载缓存/旧版本 | 核实本机 `brew` 来源和帮助；先看支持的预览方式 | 不先执行自动更新；`autoremove` 需检查依赖；`--zap` 可能涉及数据 |
| Xcode DerivedData | 指定工程、索引/构建代价、后台进程 | 清理后需重建；不与 Archives 混为一谈 |
| Xcode Archives / dSYM | 发布、崩溃符号化和回溯需求 | 可能是唯一发布证据，默认保护 |
| Simulator runtimes/devices | Xcode/项目版本和测试设备依赖 | 通过 Xcode/受支持 simctl 管理，不直接删 CoreSimulator 整树 |
| iOS 设备备份、Photos、邮件库 | 备份/恢复需求与个人数据 | 默认保护，存储大不表示冗余 |
| Time Machine / APFS 快照 | 备份、回滚、可回收空间与卷关系 | 不把快照显示大小直接相加；仅明确授权后按官方方式处理 |
| Docker Desktop / 虚拟机盘 | 卷、数据库和镜像身份 | 不删除整个磁盘映像释放空间，不默认 prune volumes |
| `/System`、`/usr`、SIP 保护内容 | 系统管理 | 不关闭 SIP、不取得权限强删、不使用所谓系统瘦身脚本 |

存储空间由系统管理和 APFS 特性共同影响，Finder、磁盘工具和普通文件逻辑大小可能不是同一口径。隔离缓存不释放空间；清理后测量同一卷的可用空间变化并记录其他并发活动，不能将差值全归因于某一个动作。[MAC-1](00-sources.md#mac-1)

## Apple Silicon、Intel 与工具管理器

`/opt/homebrew` 和 `/usr/local` 的存在可作为 Homebrew/架构排查线索，但不能据此自动删除其中一个。Rosetta、Intel 插件、旧项目或特定 SDK 可能仍依赖另一套工具。需要真实二进制架构、PATH、项目配置和进程证据后才提出退出计划。

建议用户态 DevRoot 为 `~/Developer/.tooling`。统一的是自己管理的数据位置，不迁移 Homebrew Cellar/Caskroom、系统 JavaFramework 或安装器管理的目录。用户态 JDK 与 Maven 优先用 SDKMAN!（`~/.sdkman`），不要与 Homebrew `java`/`maven` cask、jenv 同时设 `current`。系统 `/Library/Java/JavaVirtualMachines` 仍按安装器管理，不搬进 SDKMAN。macOS `~/Library/Caches` 是常见缓存位置，改到统一 DevRoot 是可配置组织选择，不声称性能或系统兼容性更好。[SDK-1](00-sources.md#sdk-1)、[BRW-1](00-sources.md#brw-1)

zsh 的 `.zshenv`、`.zprofile`、`.zshrc` 与 GUI 应用环境的加载方式不同。只维护经确认的单一配置入口，验证登录 shell、交互 shell、IDE 和 launchd；不要把交互命令、大量 PATH 追加或管理器初始化盲目写入所有文件。

## 软件彻底卸载

确认 bundle ID、版本、架构、安装来源和是否有官方卸载器。需要后台服务/系统扩展的产品优先官方卸载流程，不能仅拖走 `.app` 就宣称已彻底卸载。Homebrew 管理的 app 按对应 cask 的实际规则处理，不能先删除 bundle 再假定收据/服务已清理。[MAC-2](00-sources.md#mac-2)、[BRW-1](00-sources.md#brw-1)

卸载后再核验已加载后台项、登录项、明确归属的 preferences、Application Support、Containers、Group Containers、缓存和日志。应用配置与个人资料的保留选择单独确认；厂商共用组件和容器不随单一应用删除。`pkgutil --forget` 类操作是收据管理，不可当作卸载文件的等价替代。不要自动使用广泛的 cask `--zap` 规则。

不建议通过 `purge`、清空缓存或禁用安全功能声称普遍提速。优化必须与可测量的实际问题对应。
