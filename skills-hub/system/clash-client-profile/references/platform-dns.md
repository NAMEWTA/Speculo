# 系统 DNS、缓存与 IPv6：按实际网络服务修改

本节是现场操作参考，不代表在用户设备执行过。先读本机版本/帮助、运行身份与网络管理方式。只读任务不执行 flush 或 set。所有系统写入需要覆盖确切网络服务/接口的授权、原状态和可用回滚；不碰其他企业 VPN 或远程管理路径。

## 所有系统都先验证的条件

1. 客户端内部 resolver 真的启用且上游可用，DNS 请求到达它后能返回合理响应。
2. TUN 不仅创建接口，还把目标业务与 UDP/TCP DNS 路由到预期路径。Mac/Windows 发往局域网 resolver 的请求不能假定自动劫持。
3. 要填到网卡的 IP 是已证明可达的 DNS 服务，且协议/端口受系统支持。多数传统 DNS UI 只接受 IP 和默认 53，不接受 `https://.../dns-query` 或 `127.0.0.1:1053`。
4. 本地回环 DNS 只在确认真实监听 UDP/TCP 53、无端口冲突、无递归和服务故障策略后采用。不为方便把客户端开放到 `0.0.0.0:53`，不自动提权占端口。
5. DNS cache 是答案缓存，不是代理路由。只在生效配置确认后按本轮目标刷新一次；不得反复清缓存掩盖路径问题。

## macOS

先用实际活动网络服务，不假定名为 Wi-Fi，也不默认每台 Mac 都由同一 VPN/配置描述文件管理：

```bash
sw_vers
networksetup -listallnetworkservices
scutil --proxy
scutil --dns
route -n get default
netstat -rn -f inet6
# SERVICE 为已确认的网络服务名称
networksetup -getdnsservers "$SERVICE"
networksetup -getinfo "$SERVICE"
```

`scutil --dns` 可显示多个 scoped/supplemental resolver；只看 Wi-Fi DNS 列表不足以解释企业 VPN、按域 resolver 或应用路径。输出可能有内部域/地址，只分享摘要。`dig` 常用于对指定服务器检查，不必然等价于 macOS 应用的系统解析路径；系统路径测试需结合实际应用或系统 resolver 调用与观察。

**不要直接采用“删掉所有手动 DNS，代理就自动接管”。** 清空手动值可能恢复 DHCP 提供的路由器/运营商 DNS。只有已经证明 DHCP 路径的 DNS 同样会被接管，且没有其他 scoped resolver 绕出时，这一步才有意义。

确需系统 DNS 改动时，保存服务的原手动列表或“自动获取”状态，以及 IPv6 的原配置方式；DNS 设置样式如下，变量不能来自猜测：

```bash
# 仅当 VERIFIED_DNS_IP 已在 53/UDP 与 53/TCP 验证可达、且用户已授权
sudo networksetup -setdnsservers "$SERVICE" "$VERIFIED_DNS_IP"
```

若采用 TUN 对一个已明确的非 LAN DNS 目的地址进行拦截，也须验证该地址在当前路由下被截获，而不是实际直连公共 DNS。没有独立断线阻断时，TUN 停止后该系统地址可能直连，必须标记 crash 未通过；不要为了劫持方便偷偷填一个公众 resolver。

配置和实际系统路径确认后，可在授权范围按本机支持的方式清 DNS 缓存：

```bash
sudo dscacheutil -flushcache
# 本机系统版本确认支持且需刷新 mDNSResponder 缓存时才执行
sudo killall -HUP mDNSResponder
```

缓存操作本身没有“修复泄漏”的含义。不要重启网络服务、关闭 SIP 或清空 pf。DNS 回滚恢复原值；原先自动时可用该服务的 `networksetup -setdnsservers "$SERVICE" empty`，但这是恢复旧行为，不是隐私方案。还原后再次核对 `scutil --dns` 与实际应用。

IPv6 二选一：验证 TUN 对原生 IPv6 业务/DNS 传输的接管，或在用户明确选择后对相应网络服务禁用/阻断。不要仅根据 `dns.ipv6: false` 宣布系统 IPv6 已关闭；不要盲目把所有服务改成 off。保存 automatic/manual/link-local 等原状态，不能用统一 automatic 假装精准回滚。IPv6-only 网络或 IPv6 节点可能因此不可用，必须先检查。

## Windows / PowerShell

分别检查本机、WSL、容器与其他用户会话。WinHTTP、用户 Internet Settings、应用环境变量是不同层。

```powershell
$PSVersionTable
Get-NetIPConfiguration
Get-DnsClientServerAddress -AddressFamily IPv4
Get-DnsClientServerAddress -AddressFamily IPv6
Get-NetRoute -AddressFamily IPv6
netsh winhttp show proxy
```

记录确切 InterfaceIndex、GUID、自动/静态来源以及 IPv4/IPv6 原列表。`Get-DnsClientServerAddress` 的返回地址本身不总能证明原来是静态写入还是 DHCP；没有证明来源就不要自动改，因为届时无法精确还原。先读取现有网络配置/管理策略，受企业策略管理时停在报告。

已验证可达 DNS 服务后才对批准接口修改：

```powershell
# Index/IP 为已审阅的确切目标，不是扫描后第一个接口
Set-DnsClientServerAddress -InterfaceIndex $Index -ServerAddresses $VerifiedDnsIPs
# 原设置生效且本轮确需清缓存时，二选一即可
Clear-DnsClientCache
# 或 ipconfig /flushdns
```

不要误用 `netsh winhttp reset proxy` 或关闭防火墙来修复 DNS。系统 DoH 功能和企业策略依版本而异；不要把普通 DNS IP 字段当成系统已启用 DoH 的证明。网络探测用 `curl.exe`，避免 PowerShell 的 curl 别名。

回滚：原先明确 DHCP/自动才使用 `Set-DnsClientServerAddress -InterfaceIndex $Index -ResetServerAddresses`；静态则恢复准确原列表。多宿主解析、其他适配器、IPv6 DNS 和企业 VPN 都要验收，不能只改 IPv4 后就结束。

`strict-route` 在上游文档有 Windows 防多宿主 DNS 的作用，但也有兼容性警告。应以本机内核和实际防火墙/虚拟机工作流验证，不通用启用，不称为崩溃后仍生效的 kill switch。不建议为了 DNS 默认全系统禁用 IPv6；保护或阻断的范围由用户选择和现场能力决定。

## Linux

先确认发行版、init、网络管理器、用户会话及是否处于容器：

```bash
cat /etc/os-release
ip route
ip -6 route
readlink -f /etc/resolv.conf
# 下面只运行已安装且实际管理该机网络的工具
resolvectl status
nmcli -f NAME,UUID,TYPE,DEVICE connection show --active
```

systemd-resolved 的 stub（常见 127.0.0.53）、NetworkManager、resolvconf、dnsmasq、VPN 插件和容器 resolver 不是同一个配置文件。不要盲目覆写 `/etc/resolv.conf`，不要用 `chattr +i` 抢占管理权，更不要把 stub 的地址配置为 Mihomo 的上游而产生递归。

对 NetworkManager 使用确切 connection UUID 修改并备份该连接原 DNS/自动 DNS 设置；IPv4/IPv6 分别记录。不要为修改 DNS 停掉当前 SSH 依赖的连接。对 resolved 的 `resolvectl dns` 属于 link 范围运行时设置，可能被管理器覆盖；持久配置要在真正的管理层处理。无法确定管理层则只输出计划，不同时写多个层。

生效后可对 systemd-resolved 用 `resolvectl flush-caches`；它不存在不等于 DNS 失败，也不要装另一套 resolver。对其他服务使用其本机版本支持的缓存操作。不要关防火墙来让 TUN 生效；Linux 的 auto-redirect、路由表标记和其他 VPN 需一起审阅。

## 验收证据

对同一个批准的随机测试域名，记录系统解析调用、内核接收/上游连接、物理接口上的目的地/协议，以及业务请求。取证应限定时间/接口/测试目标，使用用户批准的抓包工具，避免采集其他业务正文；不默认上传 pcap。没有抓包权限或完整可见性就保留未验证，不以配置文件推断实际流量。

DNS 的 A/AAAA 是记录类型，DNS 的 IPv4/IPv6 是传输层：A 查询可走 IPv6，AAAA 查询可走 IPv4，二者要分别覆盖。还要检查应用硬编码 IP、DoH/DoT/DoQ、缓存和浏览器。localhost 登录回调、局域网打印/企业域不能因强制策略悄悄失效。
