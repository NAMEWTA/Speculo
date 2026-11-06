---
name: optimize-codex-config
description: 初始化或修复 Codex CLI / Claude Code 配置、隐私控制和原生额度状态栏，或诊断配置与 compaction 问题。
license: MIT
---

# AI CLI 配置维护

根据真实安装版本与当前问题选择最小修改，保留用户的模型、供应商、审批、沙箱、MCP、hooks 和未知配置。不要把最大上下文、最高推理或更多 Agent 当默认优化。
先确认实际主机、客户端和用户/项目作用域；当前容器或 WSL 不能代表用户设备。读 [配置来源](references/configuration-contract.md) 解决覆盖关系。

## 本地工具

从本技能目录运行，Node.js >=22.16.0，无需额外 npm install：

```bash
node scripts/ai-cli-config.mjs doctor --client all --scope user --json
```

工具离线读取配置，认证只看文件元数据。报告不输出密钥或配置秘密，不为查询额度读取 OAuth/cookie 或调用非公开账号接口。
自动写入范围是隐私控制与状态栏；选择 `local-private`、`privacy-only` 或 `statusline-only`，以本次目标为准。Codex 使用原生状态栏，Claude 使用本包 stdin 渲染器；缺额度数据不能填成 0。

需要修改时读 [CLI 与能力证据](references/cli.md)，使用 [能力记录示例](assets/capabilities.example.json) 记录实际支持的键与作用域，再生成脱敏计划：

```bash
node scripts/ai-cli-config.mjs plan --client all --scope user --mode local-private --evidence /private/capabilities.json --out /private/review.plan.json --json
```

检查具体差异、blockers 和既有授权，缺少授权才请用户确认。计划 ID 只校验完整性，不产生权限。证据文件是工具的实际输入，不是 AI 流程状态。
应用与回滚遵守 [事务和平台边界](references/transactions.md)：真实确认写入者已静止后才使用 `--quiescent`，不杀进程或伪造观测。Linux/macOS 支持受保护写入，原生 Windows 仅 doctor/plan/verify，不能改用 WSL 绕过限制。

```bash
node scripts/ai-cli-config.mjs apply --plan /private/review.plan.json --confirm <plan-id> --quiescent --json
node scripts/ai-cli-config.mjs verify --plan /private/review.plan.json --json
```

## 针对问题处理

[优化方法](references/optimization-method.md) 解释模型/上下文取舍；[隐私](references/privacy.md) 与 [状态栏](references/statusline.md) 说明实际控制范围；[故障诊断](references/troubleshooting.md) 处理 401/413/429、SSE 和 compaction；[来源](references/sources.md) 用于核验版本。
只在需要本地会话诊断时使用 `scripts/audit-codex-config.mjs --no-command-probes`，不默认启动客户端、联网测试或外部配置管理器。
离线验证不等于宿主已加载或账号额度可用；交付实际差异、验证结果、未验证范围和备份位置。失败时保留现场，后续编辑存在则停止回滚。
