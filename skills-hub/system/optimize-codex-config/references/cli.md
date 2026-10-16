# CLI 使用与能力证据

运行时 Node.js >=22.16.0；脚本、状态栏和解析器在技能目录内，独立复制后不需要仓库根目录或额外 npm install。统一入口是 `scripts/ai-cli-config.mjs`。旧 `audit-codex-config.mjs` 只用于具名 Codex 故障诊断，默认探针关闭；显式 `--command-probes` 是兼容维护接口，不属于默认离线工作流，必须另行核验副作用和授权。

## 完整接口

`doctor` / `plan` 接受 `--client codex|claude|all`、`--scope user|project`、`--project`、`--codex-home`、`--claude-home`、`--mode local-private|privacy-only|statusline-only`、`--evidence`、`--replace-statusline`。路径必须为绝对路径；未知或重复选项报错。默认 client=all、scope=user、mode=local-private。

`plan --out /private/review.plan.json` 显式创建新的 0600 计划文件；父目录需存在，不能覆盖旧文件，不能写入配置或认证文件名。无 `--out` 只输出 JSON，不创建目录。计划含准确路径（便于确认）但不含配置原文，应留在本机私有位置。

`apply --plan ... --confirm <id> --quiescent` 只在本次确认与静止条件成立后执行。`verify --plan ...` 离线验证。`rollback --plan ... --confirm <id> --quiescent` 使用私有事务记录恢复。没有通配 `--yes`、`--force`、在线额度探针或跳过 writer 的 CLI 选项。用于测试的库级 observer 注入不暴露给 CLI。

所有正常结果是 JSON；`--json` 可显式保留在自动化命令中。退出码：0 表示报告生成／操作成功；2 表示参数无效、阻断或 verify 未通过；1 表示未分类 I/O 或内部失败。doctor/plan 中的 blocker 不使报告生成失败，调用方必须读取 `findings` 和 `ready`，不能只看退出码。

## 能力记录不是授权

从 `assets/capabilities.example.json` 复制模板到私有位置。不要直接把它作为有效证据，也不要由测试 fixtures 推导真实支持。

完成核对后记录：

- `schema_version: 1`；`reviewed_at` 是真实核验日期／ISO 时间，不能是未来，最长 30 天。
- 每个选择的客户端 `version` 来自实际安装信息；`verification: "manual-local"` 仅在确实核对后设置。
- `keys` 逐项列出本次模式所需且实际支持的键。`plan.entries[].operations` 提供候选清单；候选不等于已支持。
- `scopes` 记录实际核验的 user/project；`higher_precedence_reviewed: true` 要求核对启动参数、托管层、活动 profile、信任、实际项目加载目录，而不是表示它们不存在。
- Codex 状态栏还需 `status_items` 的五项支持记录：model-with-reasoning、context-used、five-hour-limit、weekly-limit、context-window-size。

缺少一项、日期过期或版本不明，保留只读报告／预览并停止 apply。较旧版本没有某个隐私键时，不能伪造支持；只可选择已核验的更小模式或提出独立升级方案，升级本身也须明确授权，不能后台执行。

计划绑定文件指纹、证据文件指纹、具名环境状态、当前平台及 Node 路径；任一变化可能使旧计划失效。人工证据不是加密证明，也不替代用户对本次修改的确认。真实宿主加载结果在交付报告中单列。

## 初始化与路径

缺失 HOME 配置目录不会导致 doctor 失败；apply 在允许的平台和确认之后创建需要的目录。Claude 渲染器位于 `<target-root>/.wta-ai-cli-config/runtime/claude-statusline-<content-hash>.mjs`，通过绝对 Node 路径调用；路径含不可安全引用的 shell 字符则阻断，不拼接任意命令。不会在每次刷新时执行 npx、联网下载或依赖临时缓存。

项目 Claude 只写 settings.local.json 及该项目内的运行资源，不自动改 Git ignore、全局 excludes 或 shell profile。用户应单独检查不应提交的文件。此技能能解析自定义 CLAUDE_CONFIG_DIR，不代表仓库安装器已经支持所有自定义全局安装路径；安装器当前边界保持不变。
