---
name: optimize-codex-config
description: 体检并优化本机 Codex 配置；当任务涉及 config.toml、auth.json、自定义模型供应商、权限、Agent、MCP、Hook、配置漂移，或 Codex 的 401、403、404、413、SSE、超时与 compaction 故障时使用。
---

# Optimize Codex Config

以**体检**为主导词：先建立脱敏事实，再提出配置变更。默认只读；修改本机配置前必须向用户展示完整目标和脱敏 diff，并取得本次修改的明确确认。

## 1. 锁定范围与权限

1. 解析实际 `CODEX_HOME`；未显式设置时使用当前用户的 `~/.codex`。将它转成绝对路径并确认目标是目录且不是符号链接。
2. 将请求归类为只读体检、故障诊断或配置修改。只读体检和诊断不取得写权限。
3. 将本 skill 的写入边界限制为用户明确指定的本机 Codex 文件。CC Switch 数据库、远端 API、反向代理和 Nginx 只输出归因与交接建议。
4. 在任何可能写入前记录 `config.toml` 的哈希、大小和修改时间，并检查目标文件是否存在已证明的可写句柄。普通 Codex CLI、ChatGPT/Codex 应用进程及其 helper 的存在不构成 writer 证据。

**完成标准：** 实际 `CODEX_HOME`、任务类型、允许写入的文件和外部边界均已明确；符号链接、已证明的活跃 writer、不明确目标，或修改任务无法取得 writer 观测时已成为 blocker。只读任务可以把不可用探针记录为 unknown 后继续。

## 2. 建立只读基线

从本 `SKILL.md` 所在目录运行：

```bash
node scripts/audit-codex-config.mjs --codex-home <absolute-directory> --json
```

需要离线或可复现 fixture 时加入 `--no-command-probes`；需要缩小会话扫描范围时使用 `--since-days <N>`。先运行 `--help` 核对当前接口；CLI 不在导出的 `PATH` 中时，用 `command -v codex` 取得绝对路径并传给 `--codex-bin`。

1. 保留审计脚本的结构化结果；不得把 `auth.json` 内容、提示词、工具输出、完整接口 URL 或 bearer token复制进报告。
2. 直接查看配置时，先遮蔽 `experimental_bearer_token`、静态认证 header、环境变量值和 URL 主机。只检查 `auth.json` 的存在、文件类型、权限和 Codex 报告的认证模式，不读取或打印文件内容。
3. 对配置、供应商、认证、权限、Agent、MCP、Hook 或历史设置提出判断前，读取 [configuration contract](references/configuration-contract.md)，并用已安装 CLI 与当前官方配置参考验证每个拟使用的键。
4. 把用户提供的既有设置视为需要保留或评估的事实，不把个人模型、认证方式或权限策略提升为通用默认值。

**完成标准：** 当前版本、配置指纹、认证存储模式、供应商契约、权限、Agent、MCP、Hook、会话故障和 writer 状态均有脱敏证据；无法取得的事实被标为 unknown。

## 3. 归因故障

当请求包含 HTTP 状态码、SSE、超时或 compaction 失败时，读取 [troubleshooting](references/troubleshooting.md)，按其中证据梯度完成归因。

1. 关联错误发生前最近一次 `token_count`，但只保留 token 数和模型上下文窗口。
2. 区分本机配置、认证、供应商 wire API、远端模型服务和前置代理。HTML 代理错误页属于代理证据，不归因给模型。
3. 对外部问题给出可复现证据、影响、临时本机缓解和服务端交接项。本 skill 不探测或修改用户未授权的远端系统。

**完成标准：** 每个错误只有一个主要归属域，证据与推断分开，所有本机缓解都标明质量、成本或频率代价。

## 4. 设计目标状态

只询问审计无法发现且会改变方案的偏好：模型与推理等级、认证存储、审批与沙箱、网络访问、Agent 并发、供应商认证方式、历史保留，以及 MCP/Hook 的保留意图。

输出确认包：

1. 当前状态和问题证据；
2. 目标状态及每项理由；
3. 逐文件脱敏 diff；
4. 明确保留的未知项、MCP、Hook、profile 和兼容设置；
5. 备份名、原子写入方法、验证命令和回滚条件；
6. 不在本机范围内的外部 blocker。

只采用当前官方参考与已安装 CLI 均能验证的键。项目级 `.codex/config.toml` 不承载 provider、auth 或其他被 Codex 忽略的机器级设置。

**完成标准：** 用户无需猜测任何目标值；diff 不含 secret；未关联的现有设置不会被清理；外部问题不会伪装成本机可修复项。

## 5. 确认后原子写入

只有用户在看到确认包后明确同意本次变更，才执行以下动作：

1. 重读指纹；若配置已变化、存在目标文件的可写句柄，或 writer 探针仍为 unknown，停止并重新体检。
2. 为每个待改文件创建不覆盖的 `*.pre-optimize-<YYYYMMDD-HHMMSS>.bak`，并将包含凭据的文件权限设为 `0600`。
3. 在同一目录写临时文件、解析或加载验证成功后 rename 到目标，保留与任务无关的表和注释。
4. 仅在用户明确要求且已安装 Codex 能验证格式时处理 `auth.json`。文件存储是有效选择，不强制迁移钥匙串；不得自行发明认证 JSON schema。

**完成标准：** 写入前后的指纹、备份和确认可对应；目标文件是原子替换结果；没有越出已确认文件集合。

## 6. 验证与交付

1. 运行 `codex doctor --json`，再核对 `codex features list` 和 `codex debug models --bundled` 中与目标相关的能力。
2. 验证配置加载、认证模式、权限与沙箱、MCP、Hook、Agent 和旧会话恢复。只有用户授权可能计费的网络请求后，才执行最小第三方 API 请求。
3. 任一必须验证项失败时恢复备份，重跑相同检查并报告原始失败与回滚结果。
4. 报告已改变、已保留、已验证、未验证和外部 blocker；不回显任何 secret 或完整 URL。

**完成标准：** 所有已确认变更通过本机验证，或已完整回滚；报告包含命令、退出码和关键脱敏证据。
