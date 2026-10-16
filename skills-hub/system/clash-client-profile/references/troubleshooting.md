# 规则模式、Claude Code、DNS/IPv6 与 crash 排查

## 先明确证据

“客户端已开启”“节点叫美国”“公网 echo 返回美国 IP”“时区在纽约”均不能单独证明 Claude Code 的请求经过预期路径。浏览器登录、CLI API、插件、MCP、更新器可能由不同进程、网络命名空间或主机发出。Cloud/SSH/WSL/Container 内的 localhost 不是 Mac 宿主。

为一次失败记录时间、运行主机、客户端/内核/CLI 版本、脱敏错误、目标域名、匹配规则、策略链和最终叶子。不要收集 API key、OAuth URL、订阅、Cookies、完整进程参数或其他用户连接。401/403、超时和区域错误并非同一种失败。

## 分层检查与处置

| 层 | 观察方法 | 失败/未知时的最小动作 |
|---|---|---|
| 应用入口 | 同一主机/同一会话启动 CLI，核对代理变量和 NO_PROXY；浏览器单独检查 | 保留原变量，只给目标子进程临时设置；不写全局 shell profile |
| 代理监听 | 核对当前客户端实际 HTTP/mixed/SOCKS 端口及监听进程 | 不猜 7890；失败停止，不清代理环境后直连重试 |
| 规则与策略组 | Rule 模式下观察目标连接、第一条命中规则、逐层策略组和叶子 | 修正已证实的优先级冲突或 DIRECT 选择；节点切换须在授权内 |
| TUN | 路由、虚拟接口、进程所在命名空间、实际连接 | 开关 true 不算接管；保留原系统代理，先验证再迁移 |
| DNS | 区分应用解析、系统 resolver、内核 resolver、代理节点 bootstrap、浏览器 DoH | fake-ip 和加密 DoH 都不是防泄漏证明；不直接替换系统 DNS |
| IPv6 | 区分本机原生 IPv6 路径与代理出口 IPv6；分别观察路由和目标请求 | dns.ipv6=false 不会禁用系统 IPv6；选择已验证的隧道路由或经授权的系统级阻断 |
| 崩溃/切网 | 在明确许可的测试窗口模拟客户端退出、重连、睡眠唤醒 | 检查保护的流量是阻断还是直连；TUN 本身不是 kill switch |
| 服务侧 | 已证明目标流量走正确叶子，但仍地区拒绝 | 核对服务地区/账号资格、出口 IP 地理数据库和信誉，联系服务方；不改系统区域伪装修复 |

规则按运行时实际顺序判断；DOMAIN-KEYWORD 会匹配含相同字符串的无关域名。不要用 `*claude*` 或全局 node/python 代理来替代观察。内核通常看到真正的可执行进程，不保证看到 npm 包脚本路径。TLS SNI、QUIC、ECH、代理链或版本差异可能限制域名/进程可见性；未知要报告，不假造规则命中。

## macOS

先只读 `sw_vers`、`uname -m`、`scutil --proxy`、`scutil --dns`、`route -n get default`、`netstat -rn -f inet6`。`networksetup -listallnetworkservices` 可列网络服务；不要假定服务叫 Wi-Fi。注意输出包含内部域名与网络地址，分享前脱敏。GUI 的系统代理不代表所有 CLI 库都读取它。

Python 3 可用后，在技能目录运行默认离线检查。需要外部探测时，用界面核实的实际端口：

```bash
python3 "$SKILL_DIR/scripts/proxy_doctor.py" --network --proxy http://127.0.0.1:7890
```

排除终端代理变量干扰时，只在目标子进程范围内设置。下面的端口只是示例；先检查实际 Claude Code 版本的代理支持，不把 HTTP 代理配置强加给只支持其他方式的版本：

```bash
HTTP_PROXY=http://127.0.0.1:7890 HTTPS_PROXY=http://127.0.0.1:7890 http_proxy=http://127.0.0.1:7890 https_proxy=http://127.0.0.1:7890 ALL_PROXY= all_proxy= NO_PROXY=localhost,127.0.0.1,::1 no_proxy=localhost,127.0.0.1,::1 claude
```

这只约束遵守这些变量的客户端；不能保证工具子进程、MCP 或浏览器使用同一路径。不要自动 `launchctl setenv`、修改 `.zshrc`、关 SIP、重写 pf 或卸载其他 VPN。仅设置显式代理也不是整机 kill switch。

## Windows / PowerShell

用 `$PSVersionTable`、`Get-NetIPConfiguration`、`Get-NetRoute -AddressFamily IPv6`、`Get-DnsClientServerAddress`、`netsh winhttp show proxy` 只读检查；用户互联网代理、WinHTTP、环境变量和 WSL 网络层各自独立。Windows PowerShell 的 `curl` 可能是别名，网络例子使用 `curl.exe`；本脚本也显式查找 curl.exe。

```powershell
& python "$SKILL_DIR\scripts\proxy_doctor.py"
& python "$SKILL_DIR\scripts\proxy_doctor.py" --network --proxy http://127.0.0.1:7890
```

若只有 Python Launcher，先验证 `py -3 --version` 并替换命令。临时修改进程环境前保存“变量是否存在”及原值，用 try/finally 恢复；不要使用 setx 持久化代理。可在独立 PowerShell 会话配置目标程序，关闭会话恢复原环境。不要为诊断重置 WinHTTP、停防火墙或改注册表全局代理。

WSL 的 NAT、镜像网络及 Windows 代理可达性依版本而异；不假定 WSL 的 127.0.0.1 就是 Windows 服务。只有发现实际地址后才决定目标。跨主机代理地址不在脚本自动探测范围内，应使用相应主机的实例或经审查的手动检查。

## Linux / 容器 / 远程

读 `/etc/os-release`、`ip route`、`ip -6 route`。有 systemd-resolved 时用 `resolvectl status`；否则查看实际 resolver 管理方式，不能只看 `/etc/resolv.conf` 就判断全部 DNS。检查 systemd 用户服务、图形桌面与 shell 是否继承相同代理环境；不要把 shell 导出当成所有服务生效。

容器与远程 Agent 运行在其自身网络上下文。不要修改宿主路由来掩盖容器没有代理。诊断脚本只接受 numeric loopback，避免把 controller secret 发送到远程地址；其他拓扑保持未验证，不自动开放 0.0.0.0。

## DNS、IPv6 与独立验收

新增的 [DNS 工作流](dns-workflow.md)、[系统 DNS](platform-dns.md)、[浏览器隐私](browser-privacy.md) 和 [事务验收](acceptance.md) 提供本轮具体流程。优先区分节点 bootstrap 与业务解析；真实 DNS wire probe 不等于系统劫持已验证。

显式 HTTP CONNECT / socks5h echo 探测只测试该请求路径。脚本不在 IPv4 loopback HTTP 代理前加 `curl -6`，因为那会限制连接代理的地址族；它使用 IPv6-only echo 主机测试代理远端 IPv6 能力。探测失败表示不可用/未知，不代表泄漏；探测成功也不代表本机原生 IPv6 已被接管。

`respect-rules`、resolver 选择、代理节点域名解析与 bootstrap 必须配合当前内核验证。国外 DoH 可以仍经直连；53 端口劫持不涵盖所有 DoH/DoT/浏览器解析。规则模式下直连目标查真实地址失败时，按 [DNS 工作流](dns-workflow.md) 第 6 节检查业务上游有没有 `#保护组`，以及钉住之后的真实交换有没有回包。`198.18.0.0/15` fake-ip 不是公网出口，不能做地理定位。不要通过随意添加全局 DNS 规则制造代理启动循环。

更严格的防直连需要系统级、经过测试的网络隔离策略；设计时保留代理服务器访问、DNS bootstrap、DHCP、局域网管理、远程救援和回滚。规则模式本来允许一部分 DIRECT，因此先定义受保护的应用/目标范围。没有明确授权不切防火墙规则，不做可能中断远程管理的 crash 测试。

## 回归矩阵与报告

| 场景 | 最低可接受证据 |
|---|---|
| CLI 与浏览器登录 | 各自真实请求时间与匹配规则/最终叶子；登录回调中的 localhost 不被代理破坏 |
| 订阅刷新、组切换 | 目标规则仍在、最终叶子非 DIRECT，旧连接与新连接明确区分 |
| 节点故障/客户端退出 | 受保护流量按设计阻断，不悄悄改为直连；未实测写未验证 |
| IPv4 / IPv6 / DNS | 三项分别记录；不以一个 echo 请求代替 |
| 睡眠唤醒、Wi-Fi/有线切换 | 切换后重做目标连接检查；没有设备访问则留待现场 |
| 回滚 | 原配置与原代理路径恢复、未覆盖用户并发修改 |

最终表列出配置写入、运行时加载、目标规则链、echo、真实应用、DNS、IPv6、crash 隔离。没有完成的验证不能写 PASS；退出码 0 也不是安全认证。只提交脱敏摘要，不将 controller 原始快照提交 Git。
