# 开发工具链：盘点、归一化与原生清理

所有命令与目录都需要按本机 OS、体系结构、工具主版本及安装来源核实。这里的官方资料链接是**待核验入口**，交付时未在线读取；不得称为已验证的最新支持矩阵。默认检测脚本不执行下述命令，也不以默认路径作为最终生效配置证明。

## 先区分四个层级

运行时/版本管理器管理 JDK、Node、Go SDK、Rust toolchain、Python 等；依赖管理器处理项目的第三方包；缓存保存可重建内容；配置与状态决定解析、凭据和用户安装工具。一个目录可能包含多个层级，不能因为安装工具名称里有“包管理”就将其根目录划为缓存。

推荐每个生态只有一个明确的主解析入口，但不强制所有语言使用同一个管理器。**Linux 与 macOS 上，JDK 与 Maven 优先用 SDKMAN!**（`java` / `maven` candidate），不要同时让 jenv、Homebrew `java`/`maven`、mise/asdf 的 Java 插件和 SDKMAN 争夺 `JAVA_HOME`、`current` 链接或 PATH。mise/asdf 仍可作为 Node 等其他生态的统一层候选，前提是平台、插件、受管工具和项目 pin 已被核实；官方 rustup、uv 继续管各自生态。不能让两个管理器同时争夺同一组 shims、默认版本或持久化变量。[SDK-1](00-sources.md#sdk-1)、[SDK-2](00-sources.md#sdk-2)、[MIS-1](00-sources.md#mis-1)、[ASD-1](00-sources.md#asd-1)、[RUS-2](00-sources.md#rus-2)、[UV-2](00-sources.md#uv-2)

## 本机证据等级

| 等级 | 含义 | 允许结论 |
| --- | --- | --- |
| 默认线索 | 已知常见目录 | “此路径值得检查”；不能说工具实际在用 |
| 存在证据 | 文件/目录或 PATH 命中存在 | “此位置存在”；不能证明版本或主用入口 |
| 配置声明 | 环境、允许的配置字段、项目 pin | “该来源声明了此值”；不能忽略优先级 |
| 原生查询 | 已授权、可信二进制实际执行的选定查询结果 | 标明时间、版本、shell/项目/IDE 范围及会话覆盖 |
| 工作负载验证 | 真实项目/工具运行通过 | 仅说明被测项目和范围，不推广到所有项目 |

CLI 参数、项目配置、用户配置、系统配置、当前进程环境、wrapper 和 IDE 可能同时影响结果。不要用一条 `which` 或 `where` 代替全部解析调查。对未知二进制，先核对来源而不是立即运行 `--version`。

## Java / Maven / Gradle

需要盘点 JDK 版本、架构、安装来源、JAVA_HOME、java/javac PATH 顺序、IDE JDK、Maven/Gradle wrapper、项目编译/运行约束及 toolchain 配置。多个 JDK 不一定冗余，尤其是长期支持版本、Android/IDE、不同架构或构建兼容性要求。

### Linux / macOS：SDKMAN! 作为 JDK 与 Maven 主管理器

在 Linux、macOS 和 WSL 发行版内，用户态 JDK 与 Maven **优先用 SDKMAN!** 安装、切换和固定默认版本，而不是手改 `JAVA_HOME`、剪切 JDK 目录或叠加第二套 Java 管理器。原生 Windows 不把 SDKMAN 当默认路径；Git Bash/Cygwin 若出现，单独记录，不按本规则自动迁移。[SDK-1](00-sources.md#sdk-1)、[SDK-2](00-sources.md#sdk-2)

默认线索：`SDKMAN_DIR`（未设置时 `~/.sdkman`）、`~/.sdkman/bin/sdkman-init.sh`、`~/.sdkman/candidates/java/`、`~/.sdkman/candidates/maven/`、各 candidate 的 `current` 链接、项目 `.sdkmanrc`。这些是 **SDK 安装根**，不是可清空缓存。`tmp/`、`archives/` 若存在，属于可重建下载残留，须按本机 `sdk help`/`sdk flush` 核验后再单独列为 C 类，禁止 `rm -rf ~/.sdkman`。

未安装且用户确认需要归一化时，安装 SDKMAN 本身是 **M 类、需联网** 的独立授权，不得把 hygiene 盘点视为已同意 `curl | bash`。安装后只在用户 shell 中 `source "$HOME/.sdkman/bin/sdkman-init.sh"`（或本机文档给出的等价入口），并确认它只出现在一个已核验的 profile 末尾。

用户同意启动可信 `sdk` 后，最小核验（以本机帮助为准，标识符以 `sdk list` 实际输出为准）：

```sh
sdk version
sdk current java
sdk current maven
sdk home java
sdk home maven
```

安装或切换须逐项确认 identifier、发行版（Temurin/Zulu 等）、架构和项目约束，例如：

```sh
sdk list java
sdk install java <identifier>
sdk default java <identifier>
sdk list maven
sdk install maven <identifier>
sdk default maven <identifier>
```

`sdk use` 只影响当前 shell；默认版本用 `sdk default`。项目可用 `.sdkmanrc`（`sdk env init` / `sdk env`）固定 `java=` 与 `maven=`；这与 Maven Wrapper、Gradle toolchain、IDE 项目 JDK 是不同入口，冲突时停止并列出优先级，不静默覆盖。卸载精确 candidate 用本机支持的 `sdk uninstall`，并核验 IDE、CI、wrapper 不再引用该路径。

Maven **本地仓库**（`~/.m2/repository` 或 settings `localRepository`）仍独立于 SDKMAN candidate；SDKMAN 管的是 `mvn` 发行版，不代替仓库治理。Gradle 可用 SDKMAN `gradle` candidate，但 Gradle User Home 仍按下一节保护，不整树当缓存。

### Maven 仓库与 Gradle Home

Maven 本地仓库通常可由 settings 的 `localRepository` 或调用参数覆盖。`~/.m2/repository` 只是默认线索；IDE、`-Dmaven.repo.local`、项目 `.mvn`、wrapper、全局/用户 settings 都可能改变结果。`mvn install` 形成的本地未发布产物可能没有远程可重建来源，**Maven 本地仓库不列入整体自动清理**。[MAV-1](00-sources.md#mav-1)、[MAV-2](00-sources.md#mav-2)

建议映射：`DevRoot/data/maven/repository`；保留 settings 的受支持配置锚点，合并一个 `localRepository` 字段，而不是用示例 XML 覆盖完整 settings。保护 servers、mirrors、profiles、代理与认证。不要假设 `MAVEN_USER_HOME` 或相同变量对所有 Maven 主版本都存在或覆盖相同范围。

Gradle User Home 包含配置、wrapper 分发、daemon 状态与缓存等。先确认 GRADLE_USER_HOME、项目 `.gradle`、daemon 和 IDE 关系；使用本机支持的停止/清理方式。不要整树清空 `.gradle` 以达到“归一化”。[GRD-1](00-sources.md#grd-1)

已确认可信后可考虑 `java -version`、`javac -version`、`mvn -version`；项目 wrapper 不作为默认版本探测入口。查询 Maven 有效配置可能解析插件、触网或暴露认证信息，不默认运行 `help:effective-settings` 并保存完整输出。Linux/macOS 上 JAVA_HOME 应由 SDKMAN 的 `current`/`default` 解析；不要在多个 profile 里反复 `export JAVA_HOME`。Windows 仍由已确认的原生管理器或安装器解析。

## Node / npm / pnpm

盘点 node/npm/npx/pnpm/Corepack 的全部 PATH 命中，管理器 nvm、nvm-windows、fnm、Volta、mise/asdf 的根与 shims，项目 `packageManager`、Node pin 以及 lockfile。Corepack 是否存在、是否受系统安装器管理及本机支持什么版本，需要实际确认；不假设任意 Node 都默认附带它。

`PNPM_HOME` 是可执行入口相关目录，不等于 pnpm 内容 store；项目 `node_modules/.pnpm` 与全局内容 store 也不同。用经验证的 `pnpm store path` 确定实际 store，再看本机支持的配置入口。多个 store 可能来自 pnpm 主版本、不同卷或不同配置，不是目录冗余证明。[PNP-1](00-sources.md#pnp-1)、[PNP-2](00-sources.md#pnp-2)

统一建议：npm 缓存 `DevRoot/cache/npm`；pnpm 可执行入口 `DevRoot/bin/pnpm`；store 可用 `DevRoot/cache/pnpm-store`，但项目跨卷时应评估硬链接与复制开销。可以采用“各卷相同组织规则”，不必为了物理单根目录牺牲文件系统行为。

npm `prefix` 和 Node 版本管理器可能存在冲突，不能同时强制全局 prefix 和保留每版本全局包而不验证。不要设置 NODE_PATH 来掩盖模块解析问题，不移动现有全局包目录后假设 shim、原生扩展和 Node ABI 仍可用。[NPM-2](00-sources.md#npm-2)、[NVM-1](00-sources.md#nvm-1)、[VOL-1](00-sources.md#vol-1)

可信环境中可核验的候选查询包括 `node --version`、`npm --version`、`npm config get cache`、`npm config get prefix`、`pnpm --version`、`pnpm store path`。先确认 shim 不会自动下载指定版本或执行未知插件。若本地帮助支持，`npm cache verify`、pnpm 的 store 状态命令可用于进一步检查；不要把会修复/更新状态的命令称为绝对只读。

真正清理时优先供应商支持的原生命令，例如按本机帮助审核的 pnpm store prune 或 npm cache clean；`--force`、离线安装损失与重新下载需求必须单独解释和确认。本脚本只可能隔离默认 `_cacache`，不会清空整个 `.npm`、pnpm store 或 node_modules。[NPM-1](00-sources.md#npm-1)、[PNP-1](00-sources.md#pnp-1)

## Go

分别确认 GOPATH、GOBIN、GOCACHE、GOMODCACHE、GOROOT、GOENV，以及项目 go/toolchain 指令和 GOTOOLCHAIN。GOPATH 可能是多个路径，可能包含源码；GOBIN 有用户安装的工具；GOMODCACHE 与构建缓存不是同一个目录。一般不手动设置 GOROOT，由实际选择的工具链决定。[GO-1](00-sources.md#go-1)、[GO-2](00-sources.md#go-2)

建议映射：`GOPATH=DevRoot/data/go`、`GOBIN=DevRoot/bin/go`、`GOCACHE=DevRoot/cache/go-build`、`GOMODCACHE=DevRoot/cache/go-mod`。这是待执行方案，不是直接复制命令；必须先检查现有 GOPATH/src、工具、持久化 go env 设置和项目约束。

可信二进制查询可使用 `go version` 和只列指定键的 `go env GOPATH GOBIN GOCACHE GOMODCACHE GOROOT GOENV`。为避免自动选择/下载工具链，可在记录原值后按本机支持设置会话 `GOTOOLCHAIN=local` 并在报告标明这一覆盖；不执行无范围限制的完整环境导出。

`go env -w` 与 shell/Windows 持久化变量是不同来源。选择明确的权威入口，备份旧值；不要同时设置两套然后用新终端的结果猜优先级。原生 `go clean -cache` 和 `go clean -modcache` 风险不同，后者可能损害离线复现，应独立审批。不得把 `~/go` 整体删除。[GO-1](00-sources.md#go-1)

## Rust / Cargo / rustup

Cargo Home 包含已安装二进制、配置、认证、registry 和 Git 数据；Rustup Home 包含受管 toolchain。它们都不是整目录可清空的缓存。[RUS-1](00-sources.md#rus-1)、[RUS-2](00-sources.md#rus-2)

建议 `CARGO_HOME=DevRoot/data/cargo`、`RUSTUP_HOME=DevRoot/data/rustup`，但迁移必须保全 credentials/config、cargo install 工具、toolchain override、项目 rust-toolchain 文件、自定义目标与本地链接 toolchain。管理器创建的 shim 和环境初始化按官方流程重建，不能随意剪切两个 Home 后宣布完成。

可信查询可参考 `rustup show`、`rustup toolchain list`、`rustup override list`、`cargo --version`、`rustc --version`。结果仅在实际执行、版本适用、没有未知 wrapper 时记录为核实。是否可卸载 toolchain，要查项目 pin、target 和已安装工具依赖，不只看当前 default。

项目 `target` 只有在确认为可重建构建产物、不是自定义源码/共享目录、没有运行中的构建后，才考虑项目级 `cargo clean`。该命令不代表应清理整个 Cargo Home。不同 Cargo 版本的缓存回收能力不能凭记忆强制调用。[RUS-3](00-sources.md#rus-3)

## uv / Python / pip / pipx

区分 uv 自身可执行文件、下载缓存、受管 Python、工具环境、工具 bin、项目 `.venv`、pip 缓存和系统 Python。uv 可能由独立安装器、系统包管理器、pip、pipx 或其他工具安装；先查实际来源，不能叠加另一种安装方式再清掉旧目录。

建议 `UV_CACHE_DIR=DevRoot/cache/uv`、`UV_PYTHON_INSTALL_DIR=DevRoot/data/uv/python`、`UV_TOOL_DIR=DevRoot/data/uv/tools`、`UV_TOOL_BIN_DIR=DevRoot/bin/uv`。这些变量是否受本机版本支持需要当前帮助/文档核验。自定义安装目录、项目级配置和平台默认值优先于脚本的常见路径假设。[UV-2](00-sources.md#uv-2)、[UV-3](00-sources.md#uv-3)

可按本机帮助核验 uv 的 cache dir、tool dir、Python 安装目录查询与 pip cache dir/info。只取允许路径和版本字段，不导出带私有源 URL 或凭据的完整配置、freeze/lock/环境数据。

`.venv` 可能包含绝对路径、editable 安装、本地包和指向旧解释器的入口，不能保证可重定位。迁移项目或解释器应根据 lockfile 和已保全的本地依赖重建环境，先验证再处理旧环境；不能把整个 venv 当下载缓存。[PY-1](00-sources.md#py-1)

uv cache clean/prune、pip cache purge 应由本机支持的原生命令完成，关闭相关工具、解释离线影响后再授权。即使官方工具有自己的缓存并发安全保证，也不能扩展为“手工移动所有目录同样安全”。因此脚本不自动隔离 uv cache，只为少数结构可识别的默认 pip cache 提供可选隔离。[UV-1](00-sources.md#uv-1)、[PIP-1](00-sources.md#pip-1)

## 完成判定

每个生态至少要有：当前解析证据、权威配置来源、目标路径、保留项、受影响项目、验证与回滚记录。迁移后重开终端/IDE，验证真实构建或测试；有网络/下载的验证另行确认。旧路径只在依赖确认完成且用户再次授权后清理，不用“应该没有问题”替代证据。
