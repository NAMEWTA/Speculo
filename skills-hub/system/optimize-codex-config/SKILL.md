---
name: optimize-codex-config
description: 初始化、体检或修复 Codex CLI / Claude Code 配置、隐私控制与原生额度状态栏，诊断配置和 compaction 问题。
license: MIT
---

# AI CLI 配置维护

根据实际安装版本、配置来源和当前问题选择最小修改。保留用户的模型、供应商、审批、沙箱、MCP、hooks 与未知键；最大上下文、最高推理或更多 Agent 都不是默认优化目标。

## 确定客户端与作用域

区分用户级、项目级、worktree 与托管配置；当前容器、WSL 或远端不代表用户电脑。路径来自显式选择、实际环境和安装事实，读 [配置来源](references/configuration-contract.md) 处理优先级。

从本技能目录使用 Node.js >=22.16.0 的离线工具，无需额外 npm install：

```bash
node scripts/ai-cli-config.mjs doctor --client all --scope user --json
```

自定义路径和项目范围见 [CLI](references/cli.md)。doctor 不启动客户端、MCP、hooks 或 helper；认证只看文件元数据，不读取 OAuth/cookie 来查询额度。

## 按目标选择方案

| 模式 | 实际改动 |
| --- | --- |
| `local-private` | 已核验版本支持的隐私控制与状态栏 |
| `privacy-only` | 隐私控制，保留已有状态栏 |
| `statusline-only` | 状态栏，不宣称其他外部行为已关闭 |

[优化方法](references/optimization-method.md) 说明模型、上下文与工具取舍；[隐私](references/privacy.md) 说明哪些流量开关真正受控及其功能代价。内置自动写入只覆盖这些确定性策略，其余调整依据当前任务另作判断。

Codex 使用原生状态栏，Claude 使用随包 stdin 渲染器。[状态栏](references/statusline.md) 区分已用/剩余额度、上下文和费用；缺少数据不能显示成 0%，也不为补数访问非公开账号接口。

## 计划、应用与恢复

先用实际版本、字段和作用域证据生成脱敏差异，能力文件的具体输入见 [示例](assets/capabilities.example.json) 与 [CLI](references/cli.md)：

```bash
node scripts/ai-cli-config.mjs plan --client all --scope user --mode local-private --evidence /private/capabilities.json --out /private/review.plan.json --json
```

检查具体目标、代价、保留项和 blockers。计划 ID 绑定程序输入，不产生用户授权；已有覆盖这些改动的明确授权可继续，范围缺口才需要用户决定。不能把未知能力填成已核验来通过检查。

应用和回滚按 [事务与平台边界](references/transactions.md) 执行。只有真实确认相关写入者已静止时才使用 `--quiescent`，不自动杀进程或伪造观察。Linux/macOS 支持受保护写入，原生 Windows 的此工具仅支持 doctor/plan/verify，不能改用 WSL 绕过限制。

```bash
node scripts/ai-cli-config.mjs apply --plan /private/review.plan.json --confirm <plan-id> --quiescent --json
node scripts/ai-cli-config.mjs verify --plan /private/review.plan.json --json
node scripts/ai-cli-config.mjs rollback --plan /private/review.plan.json --confirm <plan-id> --quiescent --json
```

工具会核对文件指纹和真实备份。后续用户编辑、writer 不明或权限变化时保留现场，不强行回滚。计划和日志是工具的执行数据，不要求其他技能复制这套格式。

## 故障诊断与交付

按 [故障定位](references/troubleshooting.md) 区分本机配置、认证、供应商、代理与流式传输。413 不等于模型上下文不足，401/403 不靠提高重试解决；稳定错误先取得区分证据。

只有需要本地会话证据时才调用 `scripts/audit-codex-config.mjs --no-command-probes`。外部配置管理器和代理不在本工具的自动写入范围。

离线 verify 证明文件与策略检查，不证明宿主已经加载或账号额度可用。交付实际差异、检查结果、未验证范围与备份位置；后续宿主观察另行记录。版本依据见 [来源](references/sources.md)。
