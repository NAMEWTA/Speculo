# 系统盘点 Collector 目录

只选择当前目标适用且已存在的工具。以下命令族是发现候选，不是强制执行清单；运行前检查帮助、版本、权限和输出敏感性。

## L0

| Category | Unix/Linux candidates | macOS candidates | Required result |
| --- | --- | --- | --- |
| Host | `uname`, `/etc/os-release`, `hostname`, `uptime` | `uname`, `sw_vers`, `hostname`, `uptime` | OS、架构、稳定目标标识、时间 |
| Capacity | `nproc`, `free`, `df`, `df -i`, `mount`, `lsblk` | `sysctl`, `vm_stat`, `df`, `mount`, `diskutil` | CPU、内存、挂载点、容量和 inode |
| Runtimes | 查询已安装 Java/Go/Node/Python/Docker/包管理器版本 | 同左 | executable、版本、来源；不安装 |

## L1

| Category | Candidates | Required result |
| --- | --- | --- |
| Services | `systemctl list-units/show`；macOS `launchctl` | 名称、状态、unit/plist、ExecStart、WorkingDirectory |
| Processes | `ps`、受限 `/proc/<pid>`、`lsof` 或 osquery | PID 仅作瞬时证据；关联 executable、cwd、user |
| Network | `ss`、`lsof -i`、`netstat` | listener、address、port、process；不扫描外部网络 |
| Docker | `docker info/ps/compose ls/system df` 和必要 inspect | context、daemon、container/image/volume/network、compose 与 bind path |
| Kubernetes | current-context 和 scoped `get` | context、namespace、workload、service、ingress；不切换 context |
| Project locations | 从 service cwd、compose labels、bind mounts 和明确 roots 反查 | 只报告证据支持的路径 |

Docker inspect、Compose config、进程环境和 Kubernetes Secret 可能泄露敏感值。默认不读取进程完整环境或 Secret data，保存前按 evidence-and-redaction 处理。

## L2

只对批准根执行受限深度的容量、权限、文件类型、最大文件或 inode 热点分析。记录根、排除项、超时和实际边界；不得跟随符号链接越界或读取文件正文来判断占用。
