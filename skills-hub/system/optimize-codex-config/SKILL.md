---
name: optimize-codex-config
description: 初始化、只读体检或修复 Codex CLI / Claude Code 配置，设置五小时、周额度与上下文状态栏，关闭遥测和外部检测，诊断 config.toml、settings.json、413 或 compaction。修改前展示脱敏 diff 并取得本次明确确认；不接管 CC Switch、账号额度、远端 API 或反向代理。
license: MIT
compatibility: Node.js >=22.16.0. Self-contained offline scripts; no runtime npm install. Linux/macOS guarded apply; native Windows doctor/plan/verify only. No credential-content reads or automatic CLI/network probes.
metadata:
  author: NAMEWTA
  wta-format-reviewed: '2026-10-10'
---

# AI CLI Config

稳定调用名仍是 `$optimize-codex-config`；覆盖 **Codex CLI 和 Claude Code**，不创建依赖兄弟技能的别名。以本机事实驱动：**发现 → 体检 → 计划 → 本次确认 → 最小写入 → 验证／恢复备份**。

默认 `local-private`：遥测、反馈、外部域名预检、远程目录刷新、自动更新均提出关闭；只显示宿主已经提供的额度，不读取账号凭据查询额度。普通模型调用、云端数据政策与本机遥测开关不是同一件事。

## 1. 确认环境和范围

区分初始化、故障修复、隐私收敛和只设置状态栏。明确客户端、用户级／项目级，以及实际主机：当前容器、WSL、远程机器不是用户电脑。路径按显式参数 → `CODEX_HOME` / `CLAUDE_CONFIG_DIR` → 用户默认目录解析；项目根目录必须明确，worktree/旧版 Claude 本地设置位置不能猜测。

读取 [配置层级与版本契约](references/configuration-contract.md)。原目录不存在是正常初始化状态，不是损坏。已有目录／文件或祖先为符号链接、junction、非普通文件时停止自动写入；不得换工具绕过权限拒绝。

从本 SKILL.md 所在目录运行；先看 `--help`：

```bash
node scripts/ai-cli-config.mjs doctor --client all --scope user --json
```

自定义目录使用 `--codex-home <absolute-directory>`、`--claude-home <absolute-directory>`；项目上下文使用 `--project <absolute-project-root>`。`--client claude` / `codex` 限定单个客户端。此命令不启动 CLI、MCP、hooks、插件或 helper，不扫描会话正文；认证仅检查文件元数据。

**完成标准：** 主机、路径、作用域、缺失／损坏文件、配置来源、继承环境冲突和未知能力均被如实记录。报告不能包含配置原文、密钥、provider URL、命令秘密参数或认证内容。

## 2. 选择最小方案

读取 [优化方法](references/optimization-method.md) 和 [隐私策略](references/privacy.md)。不要把最高推理、最大上下文、更多 Agent、关闭沙箱或安装更多插件当作默认优化。模型、供应商、审批、沙箱、MCP、hooks、历史和用户未知键默认保留；相关问题单独形成确认包。

内置确定性写入限于经过版本核验的隐私控制和状态栏：

| 模式 | 用途 |
|---|---|
| `local-private` | 隐私控制＋原生额度状态栏；默认 |
| `privacy-only` | 只收敛非必要外部流量，不换已有状态栏 |
| `statusline-only` | 只设置状态栏；不宣称其他隐私项已关闭 |

Codex 用原生 `tui.status_line`；Claude 用 [stdin-only renderer](scripts/statusline/claude-statusline.mjs)。读取 [状态栏数据契约](references/statusline.md)：Codex 原生限额是剩余，Claude 输入百分比是已用；缺失不能变成 0% 或伪造余额。不得抓 cookie、读 OAuth、调用非公开接口或设置后台额度轮询。

项目模式不会暗改 HOME。Claude 个人项目配置写 `.claude/settings.local.json`；确认真实宿主加载位置，并单独检查本地设置与运行资源不会被提交进 Git。Codex 机器级 telemetry/provider 不能靠项目配置覆盖：`requires_user_scope` 是阻断，不是放宽作用域的授权。

**完成标准：** 每个目标值有理由和适用范围；未知集成保留并标记“未验证”；不把外部预检关闭描述成安全性全面提高。

## 3. 核验能力并生成脱敏计划

官方网页是配置契约，不证明用户安装的版本支持该键。按 [CLI 使用与能力证据](references/cli.md) 填写本地能力记录，模板是 [capabilities.example.json](assets/capabilities.example.json)。只记录已核验的版本、键、状态项目、作用域及更高优先级来源；不能为了让计划通过而批量填“已验证”。未知、过期、托管限制或无法核验的能力阻止写入，但不阻止只读报告。

不自动执行可能联网的客户端 doctor、登录或模型探测。已有本地版本信息、已授权且确认无外部副作用的本地帮助和当前官方契约可用于核验；不得读取认证内容补证据。外部检测仍保持关闭。

```bash
node scripts/ai-cli-config.mjs plan --client all --scope user \
  --mode local-private --evidence <absolute-capabilities.json> \
  --out <absolute-review.plan.json> --json
```

`plan` 本身不改配置；`--out` 只明确授权创建一个新的私有计划文件，父目录需已存在。计划列出逐文件目标、指纹、语义脱敏 diff、保留项、blocker、备份位置、原子替换方法和未验证项。它不保存完整原配置。已有 Claude 回调只有在用户选择替换后才加 `--replace-statusline` 并重新生成计划。

**完成标准：** 用户已看到全部目标与代价；`ready` 只是静态计划可供确认，不等于当前 writer、宿主加载或真实额度已验证。

## 4. 本次确认后应用

用户必须在看到计划后给出本次明确确认；计划 ID 是完整性标识，不是授权来源。关闭或暂停相关配置管理器及会触发 ConfigChange 的会话，再由用户确认处于静止状态。不能自动杀进程、关闭安全 hooks 或伪造 `--quiescent`。

```bash
node scripts/ai-cli-config.mjs apply --plan <absolute-review.plan.json> \
  --confirm <exact-plan-id> --quiescent --json
```

读取 [事务与平台边界](references/transactions.md)。脚本取得自身排他锁，重新核验全部观察项，检查目标可写句柄，将 `*.pre-optimize.bak` 保存在私有事务目录，先暂存再逐文件原子提交。缺失文件使用不覆盖创建；Claude 运行脚本复制到内容寻址的稳定目录，不依赖 npm 缓存或技能安装位置。

Linux/macOS writer 观测 unknown 或 busy 时阻断。原生 Windows 的句柄与 ACL 支持尚未达到自动写入门槛，**仅提供 doctor/plan/verify**；不能改用 WSL 或直接写文件绕过这个边界。多文件不是瞬时原子事务，也不承诺断电自动恢复。

**完成标准：** 只写本次确认集合；无强制覆盖、无全局 shell 环境修改、无认证内容操作。异常时尝试安全恢复备份，后续用户编辑存在则停止回滚并保留现场。

## 5. 验证和故障处理

```bash
node scripts/ai-cli-config.mjs verify --plan <absolute-review.plan.json> --json
node scripts/ai-cli-config.mjs rollback --plan <absolute-review.plan.json> \
  --confirm <exact-plan-id> --quiescent --json
```

离线验证覆盖本机 hash、完整语法、已观察的策略与依赖指纹；不代表真实宿主已经加载、账号额度可用、远端政策或既有集成零出网。重新打开宿主后由用户检查原生状态栏、配置来源和保留功能；不为验收额度而额外发起模型或账号请求。

出现 401/403/404/413/429、SSE、超时或 compaction 故障，按 [故障诊断](references/troubleshooting.md) 分离本机、认证、供应商与代理证据。旧脚本保留用于用户明确选择的 Codex 会话诊断，默认不再执行 CLI 探针：

```bash
node scripts/audit-codex-config.mjs --codex-home <absolute-directory> \
  --no-command-probes --since-days 7 --json
```

不通过提高上下文窗口、无限重试、关闭 TLS 校验或放宽权限修复稳定错误。不接管 CC Switch 数据库、反向代理或远端 API；外部问题只交接。

**交付固定为：** 已改变、已保留、已验证、未验证、阻断和回滚结果。真实设备、账号测试、跨平台 CI、离线 fixtures 和模型选择评估分别报告，未执行的项目不能标记通过。
