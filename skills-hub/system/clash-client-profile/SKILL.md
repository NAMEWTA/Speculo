---
name: clash-client-profile
description: 配置或诊断 Clash Verge Rev、FlClash/Mihomo 的 TUN、DNS 覆写、节点 bootstrap 与应用规则路径。
license: MIT
---

# Clash 网络与 DNS

先定位真实主机、客户端/内核版本、当前订阅和受影响应用，再判断问题所在。只读诊断不改配置、切节点或重启；修改沿用用户已明确的目标与范围。

区分业务路由、DNS 上游和系统劫持：DoH 加密不代表经过代理，fake-ip 不代表全部解析已被接管，地区错误也不证明泄漏。
明确目标是全部 DNS 经代理，还是允许只为代理节点启动解析的直连例外。未经选择不加入运营商/system/plaintext fallback；保留未解决的内网 DNS 需求。

## 按问题读取

- [DNS 与脚本](references/dns-workflow.md)：上游、bootstrap、规则保护组、候选和现场探针。
- [Clash Verge](references/clash-verge.md) / [FlClash](references/flclash.md)：订阅覆写与加载方式。
- [平台 DNS](references/platform-dns.md)、[浏览器隐私](references/browser-privacy.md)：系统、IPv6、DoH 与 WebRTC。
- [分层排错](references/troubleshooting.md)、[网络性能](references/network-performance.md)：实际应用与延迟问题。
- [修改与验收](references/acceptance.md)：备份、恢复和故障边界；[来源](references/sources.md) 用于版本核验。

## 可选工具

`SKILL_DIR` 是本文件目录。Python 3.10+；读取 YAML 另需 PyYAML。默认命令只读，不修改网络：

```bash
python3 "$SKILL_DIR/scripts/proxy_doctor.py"
python3 "$SKILL_DIR/scripts/dns_guard.py" plan --config effective.json --request dns-request.json
python3 "$SKILL_DIR/scripts/dns_guard.py" audit --config effective-after.json --request dns-request.json
```

[请求示例](templates/dns-request.example.json) 是工具输入示例，resolver 与组名必须来自本次实际选择。plan 生成片段，不是完整可启动配置；先检查合并语义与具体删除项。
联网探针使用明确测试范围和代理，不为通过测试改走直连。`plan` 返回 0 仅表示报告生成；`audit/probe` 返回 3 表示未覆盖整机验证，需读取实际结果。

修改前保留原件和可用恢复路径，尤其避免断开当前远程连接。通过客户端支持的覆写方式改必要部分，保留订阅、凭据、已有端口和未知字段。
分阶段读回并验证实际请求；不要关闭 TLS，或把未经验证的本地监听地址填进系统 DNS。业务规则可参考 [AI 规则示例](templates/ai-rules.yaml)，按实际域名与策略组调整。
报告已观察结果和未验证部分。静态配置、单个探针或某个测试站不能证明整台机器“绝不泄漏”。
