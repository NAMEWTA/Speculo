# 来源登记与维护

核对日期 **2026-10-10**。以下来源亲自读取；官方网页是滚动契约，未指定固定发布 tag，因此不能据此断言安装版本支持。安装前使用本地能力记录重新核验，过期超过 30 天不自动写入。

| 来源 | 本次用于 |
|---|---|
| [Codex Configuration Reference](https://developers.openai.com/codex/config-reference/) | 配置键、作用域、三个 exporter、remote_plugin、tui.status_line |
| [Codex Config Basics](https://developers.openai.com/codex/config-basic/) | 系统／用户／profile／受信任项目／flags 的优先级 |
| [Codex 原生状态栏实现](https://github.com/openai/codex/blob/main/codex-rs/tui/src/bottom_pane/status_line_setup.rs) | 状态项名称和限额含义；此前研究已读取，应用时核对对应安装版本 |
| [Claude Settings](https://code.claude.com/docs/en/settings) | scopes、managed sources、settings.local.json、disableAllHooks、skipWebFetchPreflight |
| [Claude Environment Variables](https://code.claude.com/docs/en/env-vars) | 非必要流量、遥测、调查、插件更新例外、gateway discovery 及变量语义 |
| [Claude Statusline](https://code.claude.com/docs/en/statusline) | stdin JSON、context usage、五小时／周 used_percentage、Unix 秒 resets_at |
| [Claude Best Practices](https://code.claude.com/docs/en/best-practices) | 任务范围、上下文与可验证工作流；此前研究读取 |
| [Claude Costs](https://code.claude.com/docs/en/costs) | 模型／上下文／并发的成本取舍；此前研究读取 |
| [toml-eslint-parser AST](https://github.com/ota-meshi/toml-eslint-parser/blob/main/docs/AST.md) | 完整 TOML 语法节点、resolvedKey、range、静态值；读取 blob 07c8dd79c618485b11c15e8ccb3c0f2b78c9ff62 |
| [jsonc-parser](https://github.com/microsoft/node-jsonc-parser) | 维护中的 JSON CST 编辑实现；运行时另加严格 JSON 和重复键约束 |

第三方方案研究来源：[Claude HUD](https://github.com/jarrodwatts/claude-hud)、[ccstatusline](https://github.com/sirmalloc/ccstatusline)、[ccusage](https://github.com/ccusage/ccusage)、[CC Switch](https://github.com/farion1231/cc-switch)、[Claude Code Router](https://github.com/musistudio/claude-code-router)、[rulesync](https://github.com/dyoshikawa/rulesync)、[Everything Claude Code](https://github.com/affaan-m/everything-claude-code)。这些是此前已完成的选型研究，不是所有代码路径／版本的安全审计，更不是本次安装授权。

## 可复现依赖

运行时解析器固定为 toml-eslint-parser 1.0.3、eslint-visitor-keys 5.0.0、jsonc-parser 3.3.1；维护构建使用 esbuild 0.25.5。bundle、内容 SHA-256、构建 lockfile 和完整第三方许可证均随技能分发。维护者构建脚本需显式 `--fetch`；技能、安装器、状态栏和离线测试不调用它。构建需先用锁定依赖，再验证 standalone import；bundle checksum 测试防止内容与 manifest 脱节。

维护更新应在独立分支完成：重新阅读官方内容，更新政策／能力候选，增加旧版及缺失字段 fixtures，重建锁定 bundle（确有需要时），运行三平台测试及独立安装验收。不能由来源检查任务自动升级配置、查询真实账户、合并或发布。
