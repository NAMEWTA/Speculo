---
name: clash-client-profile
description: 配置或诊断 Clash Verge Rev、FlClash/Mihomo 的 TUN、订阅 DNS 覆写、节点 bootstrap 与应用规则路径。
license: MIT
---

# Clash 网络、DNS 与应用路径

先定位真实主机、客户端/内核版本、活动订阅和受影响的应用入口。WSL、容器、SSH 与用户桌面的 localhost 不一定相同。只读诊断不改配置、切节点或重启；修改沿用已经明确的目标和范围。

## 先分清问题在哪一层

| 观察对象 | 要回答的问题 |
| --- | --- |
| 应用业务流量 | 实际命中哪条规则、哪个策略组和叶子节点，是否存在 DIRECT 或旧连接 |
| DNS 上游连接 | 查询送往哪个 resolver，连接是否经过预期代理 |
| 系统 DNS 接管 | UDP/TCP 53、局域网解析、系统/浏览器自带加密 DNS 是否按目标处理 |
| 节点启动解析 | 代理尚未可用时，节点域名和 resolver 自身怎样解析 |
| IPv6 / WebRTC | 是否存在独立于当前代理路径的出口 |
| 稳定性与性能 | 冷启动、切网、故障、延迟问题由哪一层产生 |

DoH 加密不等于经过代理，fake-ip 不等于全部解析已接管，规则 TUN 也可能走 DIRECT。地区报错需要结合路由、出口和服务响应判断，不能单凭报错判定泄漏。

## 选择本次需要的技术分支

- [DNS 与工具](references/dns-workflow.md)：resolver、保护组、bootstrap、候选片段和现场探针。
- [Clash Verge](references/clash-verge.md) / [FlClash](references/flclash.md)：订阅覆写、合并和实际加载。
- [平台 DNS](references/platform-dns.md) / [浏览器隐私](references/browser-privacy.md)：系统、IPv6、DoH 与 WebRTC。
- [分层排错](references/troubleshooting.md) / [网络性能](references/network-performance.md)：规则链、旧会话、延迟、QUIC 与 MTU。
- [修改与验收](references/acceptance.md)：备份、恢复、冷启动与失效检查；[来源](references/sources.md) 用于核验版本差异。

明确目标是全部受保护 DNS 经代理，还是允许仅为节点启动使用直连例外。保留必要的内网/split DNS 需求；不能为通过公网测试擅自替换企业解析，也不因超时自动加入运营商/system/plaintext fallback。

## 使用实际工具

`SKILL_DIR` 是本文件目录。工具需 Python 3.10+，读取 YAML 另需 PyYAML。下面命令默认离线，不修改网络：

```bash
python3 "$SKILL_DIR/scripts/proxy_doctor.py"
python3 "$SKILL_DIR/scripts/dns_guard.py" plan --config effective.json --request dns-request.json
python3 "$SKILL_DIR/scripts/dns_guard.py" audit --config effective-after.json --request dns-request.json
```

使用私有的完整生效配置，而非 controller 的局部配置摘要。[请求示例](templates/dns-request.example.json) 说明工具输入；resolver、组名和例外取自本次真实选择。

`plan` 生成待合并片段及变更说明，不是可直接启动的完整配置。检查删除项、空 map 与覆盖语义。联网 probe 按明确测试范围，经指定代理发出请求；失败不偷偷直连。

退出码与结果一起看：plan 的 0 只说明计划生成；输入错误、阻断与未覆盖整机验证分开处理，audit/probe 的 3 不能等同整体通过。

## 修改与验证

保留本轮涉及文件的原件和恢复入口，先考虑当前远程连接能否安全恢复。通过客户端支持的覆写方式调整必要部分，保留订阅、凭据、端口、未知字段和已有网络需求。

按实际依赖分步验证配置合并、内核加载和真实应用请求。规则可参考 [AI 域名示例](templates/ai-rules.yaml)，但组名与域名必须对应当前环境；GLOBAL 模式与规则模式的生效逻辑不同。

不要把未验证监听的 127.0.0.1 写入网卡 DNS，也不要关闭 TLS 或既有代理路径来掩盖故障。只有证据指向该层才调整系统或浏览器设置。

报告观察到的版本、应用策略链、DNS 与相关故障结果，以及明确未测的部分。单次探针、静态候选或测试站结果都不足以证明整台机器“绝不泄漏”。
