# 系统健康：按平台取证，不套用一键优化

## 共通步骤

明确慢的是启动、交互、编译、磁盘、网络还是远程会话；记录工作负载、采样窗口、机器电源模式与可用空间。先用短时采样找瓶颈，再对具名路径/进程深入。不要默认全盘遍历、读取全部日志或安装诊断依赖。命令缺失/权限拒绝就记录，不自动提权。

工具版本与 CPU 架构必须对应实际进程。可执行文件存在不等于当前 shell 正在使用正确版本。保留当前 Agent、编辑器、包管理器和其活动运行时。网络故障先诊断代理/证书/解析，禁止用关闭 TLS、杀毒或防火墙“加速”。

## macOS

`sw_vers`、`uname -m` 检查版本/架构；`df -h` 看卷余量；`vm_stat` 与活动监视器查看内存压力/交换；`iostat -w 1 -c 3` 做短时磁盘样本（参数以本机帮助为准）。Apple Silicon 上区分原生与 Rosetta、`/opt/homebrew` 与 `/usr/local`，不为统一路径移动正在使用的工具链。

APFS clone、稀疏文件、快照和 purgeable 空间使目录大小相加不等于可释放量。Time Machine 快照不是普通缓存；不自动删。iCloud 占位文件不能在审计时批量读取而触发下载。登录项/后台项只列目标，不全停。禁止默认关闭 SIP、Spotlight、Gatekeeper 或清空所有 Library/Caches；所谓“释放内存”不等于性能提升。

只有定位到独立可重建缓存、没有活动占用、用户授权且有验证方法时才提出清理。开发工具可用自身只读信息查询；brew cleanup、Docker prune 等写操作留在具名计划中，不在诊断时运行。

## Windows

先 `$PSVersionTable`、`Get-CimInstance Win32_OperatingSystem`（只选版本/架构等必要字段）、`Get-Volume`。用任务管理器/资源监视器或短时计数器区分 CPU、内存提交量与磁盘队列；Get-Counter 的计数器名受语言影响，不假定英文路径通用。

NTFS 压缩、硬链接、junction/reparse point、OneDrive 占位文件导致逻辑大小不等于释放量。扫描不跟随重解析点，不遍历 Windows 系统目录清理。WinSxS、pagefile、WinRE、Defender、更新维护与还原点不包含在普通审计/清理授权。

原生 Windows、WSL 与 Docker Desktop 三个环境单独记录。删除 Linux 文件不保证 VHDX 已向宿主回收空间；压缩/优化虚拟盘必须识别归属、备份、停止对应工作负载并单独授权。不要停止当前 Agent 所在 WSL 实例。

## Linux

`cat /etc/os-release`、`uname -m`、`df -h`、`df -i` 先区分空间与 inode；有 procps 时 `free -h`、`vmstat 1 3`，有工具时用短时 iostat 样本。page cache 可回收，低 free 本身不是内存故障。容器可见 CPU/内存可能受 cgroup 限制，不能用宿主总量估算容器容量。

systemd 存在才查 `systemctl --failed`、`journalctl --disk-usage`，不把日志全部导出。不默认 `journalctl --vacuum-*`、drop_caches、swapoff、sysctl、禁用 SELinux/AppArmor。只读判断缓存、日志保留政策与磁盘挂载关系，写操作独立授权。

区分 apt/dnf/pacman、glibc/musl 和桌面/无头系统，不猜包名。`du` 只扫具名目录且不跨文件系统；只读扫描也应限定成本。Docker/Podman volumes 可能含数据库，禁止把 prune --volumes 当常规优化。

## 验证与回滚

报告前后相同 workload 下的时长、峰值资源/空间与运行状态，标明采样误差。可用空间变化不等于性能变化。权限、工具或目标机器不可访问时交付具体缺口，不以容器结果代替用户电脑。

所有系统写入遵守对应任务技能的备份、预览、最小修改和回滚流程。回滚不保证可逆地恢复删除的数据；没有恢复方案就不能称为可回滚优化。
