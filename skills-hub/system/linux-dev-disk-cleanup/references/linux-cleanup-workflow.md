# Linux 开发机清理工作流

用于大范围审计、交互式清理规划，或已授权执行。按这台机器裁剪清单。某个工具或路径不存在是结果，不是错误。

基线写到清单，并另存一份不覆盖的记录，例如 `/tmp/cleanup-YYYYMMDD-manifest.txt`。

## 只读发现

提出方案之前先抓初始快照：

- `df -h /` 与 `df -ih /`。只报根分区。overlay 行和同一文件系统上的 loop 是同一块盘的另一种视图，不相加。光盘或 ISO 挂载（例如 `/dev/sr0`）不占根分区。
- `du -xh --max-depth=1` 从 `/`、`/var`、`/var/lib`、`/var/tmp`、`/home`、`/root` 和大型项目根开始。跳过 overlay 挂载点。inode 紧张时再查文件数量。
- `docker system df`，以及 `docker ps` 的名字、状态、健康。数据根用 `docker info -f '{{.DockerRootDir}}'`。
- `journalctl --disk-usage`，`du -sh /var/cache/apt/archives /var/log`。
- `snap list --all` 里的 disabled 修订。`uname -r` 和已安装的 `linux-image-*`。
- 各用户的语言缓存：`go env GOCACHE GOMODCACHE`、`npm config get cache`、Cargo registry、Gradle caches、Maven repository、pnpm store。把缓存目录和工具链目录分开。

体积扫描可能很贵。从已知的大目录往下钻，不要对同一 overlay 再走一遍。

## 给候选分类

| 类别 | 通常怎么处理 | 主要风险 |
| --- | --- | --- |
| 过期临时目录 | 无进程、mtime 已旧、清单点名后按确切路径删除 | 父目录里还有别的工作 |
| 可重建构建缓存 | 官方命令：`cargo clean`、`go clean -cache` | 下次编译变慢，源码必须留下 |
| 可重新下载的依赖缓存 | 第二波：module、registry、Gradle caches、Maven repository | 离线时无法马上重建 |
| Docker 未使用数据 | 先看挂载，再按下面的顺序 prune | 匿名 volume 里可能有已停止栈的数据 |
| 包缓存与旧 snap 修订 | `apt-get clean`；只删 disabled 修订 | 误卸当前 snap 或回退内核 |
| 日志 | `journalctl --vacuum-size=`，需要时再写上限 | 丢掉旧日志 |
| 业务数据 | 除非被点名，否则保留 | bind mount 上的数据库、对象存储、索引 |
| 工具链与会话 | 保留，除非单独点名 | 拆掉正在用的运行时或会话 |

目录大不等于可以删除。写清谁拥有它、能不能重建、支撑哪条工作流、必须留下什么。

运行中的数据库、对象存储和搜索服务经常把数据 bind 到宿主机目录，而不是 Docker volume。匿名 volume 显示为 dangling 时，先 `docker inspect` 确认没有容器引用，再 prune。

## 清单合同

```markdown
# Linux 磁盘清理清单

> 更新时间：YYYY-MM-DD
> 当前状态：只读排查 / 决策中 / 已授权执行 / 已完成

## 基线
| 文件系统 | 总空间 | 已用 | 可用 | 使用率 | inode 使用率 |

## 已批准清理
| 编号 | 项目 | 决定 | 已知大小 | 精确边界 | 状态 |

## 明确保留
| 编号 | 项目 | 保留边界 |

## 待确认
| 编号 | 项目 | 风险/收益 | 问题 |

## 执行记录
| 时间 | 项目 | 方法 | 结果 | df 变化 |
```

候选编号跨批次保持稳定。用户收窄边界后，后续项都按新边界做。已经删掉的内容如实记录。

## 执行阶段

路径互不重叠的已批准项可以并行。编排者先写基线，最后统一验收。并行不能改变下面的 Docker 顺序。

### 1. 点名的过期临时目录

- 删除前确认路径是目录、清单写了完整路径、没有进程占用。
- 一次删除一个确切路径。不删除 `/var/tmp` 或 `/tmp` 本身，不删除 `systemd-private-*`。
- 父目录里还有未点名的子树时，停止并报告，不删父目录。

### 2. Docker

先记录每个运行中容器的 Mounts，以及因此必须留下的 volume ID。

1. `docker rm` 只针对清单点名、且当前不是 running 的容器。正在运行的不删。
2. `docker volume prune -f`。prune 之后，清理前记下的 volume ID 必须还在。
3. `docker image prune -a -f`。仍被任何容器（含未删除的已退出容器）引用的镜像会留下。
4. `docker builder prune -f`。随后看 `docker system df`。Build Cache 的 RECLAIMABLE 仍高于清单里的阈值（默认可按 1G）时，再执行一次 `docker builder prune -af`。

不运行 `docker system prune -a --volumes`。不把 `docker volume prune` 放进 cron。

### 3. 构建缓存

优先用官方命令，并且只作用于清单点名的树或用户：

- 在点名的 Cargo 项目里执行 `cargo clean`。失败时只删除该项目的 `target/`。
- `go clean -cache`。`sudo -u` 找不到 `go` 时改用绝对路径。
- `npm cache clean --force`。它不清 `_npx`；`_npx` 未单独批准就留下。

不从家目录或仓库根递归删除 `dist`、`build`、`node_modules`、`.next`。

### 4. 包、snap、journal

- `apt-get clean` 只清 `/var/cache/apt/archives`。
- `apt-get autoremove --purge --dry-run`。待删除列表含回退内核、桌面元包、docker、containerd 或其他运行时则不执行。列表只有明确的孤儿包时才真正 autoremove。
- 对 `snap list --all` 里带 disabled 的行执行 `snap remove <name> --revision=<rev>`。不带 `--revision` 就不删。不卸载 snapd。
- 清单写明时：`journalctl --vacuum-size=200M`。需要持久上限时写入 `/etc/systemd/journald.conf.d/size-cap.conf`：

```
[Journal]
SystemMaxUse=200M
```

然后 `systemctl restart systemd-journald`。重启失败就报告，不反复重试。

回收站和 `/var/crash` 只在清单点名时清空内容，目录本身留下。

### 5. 第二波：需要重新下载的依赖缓存

第一波验收通过，且清单单独批准之后才做：

- `go clean -modcache`
- 删除 Cargo 的 `registry` 目录，保留 `bin`
- 删除 Gradle 的 `caches`，保留 `wrapper`
- 删除 Maven 的 `repository`，保留 `~/.m2/settings.xml`
- `pnpm store prune`。仍被项目引用的包会留下，这是预期结果
- 浏览器只清 Cache 与 Code Cache 子目录，不删 `~/.config` 里的配置

## 硬停

出现下列任一情况，停止受影响的项并报告证据：

- 要保留的容器不再 Up，或点名的数据目录大小变了。
- prune 之后，清理前还被容器挂载的 volume 不见了。
- 删除范围从点名路径扩到父目录，或父目录里有未识别内容。
- dry-run 要移除回退内核、桌面或运行时。
- 当前内核被列进待删除包。
- 缺少执行该项所需的权限。

## 最终验收

- `df -h /` 的可用空间，以及相对基线的实际增量。目录 `du` 之和不必等于 `df` 的变化。
- `docker ps` 的名字、状态、健康与清理前的运行集合一致，除非清单批准过停掉其中某一个。
- 点名的业务数据目录大小未变。
- `uname -r` 不变，回退内核仍是 `ii`。
- 点名项目的源码还在，生成目录（例如 `target/`）已空。
- 清单写明保留的工具链和会话目录还在。

## 一次实测里学到的边界

2026-10-05，一台 Ubuntu 开发机根分区 196G，从 94%（剩余 12G）降到 38%（剩余 117G）。最大的几项是：三个已无进程的 `/var/tmp` 工作目录、84 个无引用匿名 volume、一个 Tauri 项目的 `target/`、Go build cache、未使用镜像和 build cache。19 个业务容器使用 bind mount，清理后仍全部健康；两个正在使用的 Kafka volume 被 prune 留下。

同一台机器上，一个 828M 的项目 `temp/` 因为里面还有未点名的子树而整目录保留。pnpm store 在 prune 之后几乎没变，因为包仍被项目引用。这些是分类规则的例子，不是可以在别的机器上照路径重放的删除列表。
