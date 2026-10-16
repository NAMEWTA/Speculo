# 配置层级与版本契约

核对日期：2026-10-10。官方来源与适用范围见 [来源登记](sources.md)。版本和能力必须分别记录；源码 main、网页最新键或测试 fixture 均不证明本机版本已支持。

## 发现与有效配置

Codex 用户配置是 `$CODEX_HOME/config.toml`，默认 `~/.codex/config.toml`；Unix 系统默认文件 `/etc/codex/config.toml`。优先级由高到低为 CLI flags / `--config`、受信任项目逐层 `.codex/config.toml`、`--profile` 选择的 `<profile-name>.config.toml`、用户配置、系统默认、内置默认。托管 requirements 是另外的约束，不是用户配置覆盖即可消除。

项目配置不能覆盖 provider/auth、host metadata、通知、profile 选择和 telemetry routing 等机器级设置。运行时将内置隐私控制放用户级；项目 Codex 隐私计划会报告 `requires_user_scope`。项目只设置原生 `tui.status_line` 时，仍须按安装版本核验作用域和信任。

Claude 依次检查用户 `settings.json`、项目 `.claude/settings.json`、个人项目 `settings.local.json`，更高层还有 CLI flags 和 managed sources。自定义 `CLAUDE_CONFIG_DIR` 必须显式定位。较新版本把 `settings.local.json` 定位到 Git 主工作树根，旧版或 SDK 情况可能不同；参数 `--project` 必须使用已核验的实际加载根，不猜 worktree 或子目录继承。

Claude file-based managed 配置在 macOS `/Library/Application Support/ClaudeCode/`、Linux/WSL `/etc/claude-code/`、Windows `C:\Program Files\ClaudeCode\`；读取 `managed-settings.json` 和排序后的 `managed-settings.d/*.json`。server-managed、MDM/plist、HKLM/HKCU 和 policyHelper 可能具有更高优先级。本实现不执行 helper、不读注册表、不查询服务端；发现文件托管层则停止自动修改并交给管理员审查。不要把“没有文件”推导成“没有托管策略”。

本机报告只覆盖已观察文件和具名控制环境变量。更高层、信任、profile、worktree、启动器和集成所有权必须通过本地能力记录补充人工核对；标记是 `operator-attested-not-auto-probed`，不伪装 CLI 自动验证。选中的 Codex profile 或旧 `[profiles]` 结构需要单独审查，自动基线不擅自迁移它们。

## 最小编辑与保留

TOML 使用固定版本完整语法解析器与 AST range edits；JSON 使用严格 JSON 校验和维护中的 CST 编辑库，不假定 Claude 接受 JSONC。每次修改都重解析并检查完整语义等价条件，只允许指定路径的预期差异。重复键、损坏语法、原型污染键、父级类型冲突、未知复杂迁移保持 blocked；不得用空模板覆盖损坏文件。

原注释与无关内容保留；从表形式迁移 exporter 时只移除该子树的值和表头，保留无关表及注释。原文件最多 1 MiB；超过限制应单独检查，而不是截断后修复。原文件存在时先确认读取与所有权，私有备份中保存完整原字节；报告和计划不保存完整配置。

模型、reasoning effort、model_context_window、compaction 阈值、Agent 并发、权限、MCP、hooks、历史、provider 和 auth **不在自动写入 allowlist 内**。对应优化依照 [方法](optimization-method.md) 形成单独的明确确认方案，不能向计划 JSON 塞任意 key。

## 认证与供应商

认证文件只读取存在性、类型、权限等元数据，绝不打印、diff、复制内容到计划或用于额度查询。CLI 原生登录和认证存储选择属于独立流程；不强制从文件迁移 keyring，不自行创造 auth schema。

供应商 API root、wire API、认证路线、SSE 与 compaction 支持以实际供应商契约和安装版本为准。不要机械添加 `/v1`，也不要把 Chat Completions 兼容误当作 Responses 全兼容。HTTP 风险应提示，不通过关 TLS 校验修复。第三方网关、CC Switch 数据库及远端服务器均不由本技能自动改写。

## 安全与隐私不是同一开关

保留现有审批、沙箱、本地工具安全检查及恢复机制。禁用非必要外部流量不等于开放沙箱内任意网络，也不等于云端模型请求完全离线。宿主保护的文件写入被拒绝后停止，不能用原子 rename、另一个 shell 或脚本绕过宿主权限拒绝。
