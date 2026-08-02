# Git、代码评审与交付

## 分支命名

推荐：

- `feat/workspace-search`
- `fix/session-timeout-race`
- `refactor/terminal-state-split`
- `perf/large-log-rendering`
- `test/payment-retry-policy`
- `docs/typescript-style-guide`
- `chore/upgrade-vitest`

避免 `update`、`changes`、`fix-stuff` 等无语义名称。

## 提交信息

可采用 Conventional Commits：

```text
feat(auth): add device authorization flow
fix(terminal): prevent duplicate process cleanup
refactor(store): split workspace selectors
test(cli): cover empty shell argument
```

提交应：

- 聚焦一个逻辑变化。
- 不混入无关格式化。
- 能通过基本检查。
- 不包含秘密、构建产物和本地配置。
- 说明改变的目的，而不仅是文件列表。

## Pull Request

PR 应包含：

- 背景和问题。
- 方案和关键取舍。
- 风险、兼容性和迁移影响。
- 验证方式。
- UI 变化的截图或录屏。
- 缺陷修复的回归测试。
- 未完成项和后续工作。

## 审查优先级

1. 正确性、安全、数据完整性。
2. 类型边界和运行时验证。
3. 资源生命周期、并发、错误处理。
4. 架构边界和公共 API。
5. 测试缺口。
6. 可维护性与命名。
7. 风格。

## 审查意见格式

一条有效意见应尽量说明：

- 具体位置。
- 真实风险。
- 触发条件。
- 建议修复方向。
- 是否阻塞合并。

不要只写“这里不好”“建议重构”。

## 交付检查

- 格式检查通过。
- Lint 通过。
- 类型检查通过。
- 相关测试通过。
- 构建通过。
- 文档和配置同步。
- 没有无关改动。
- 已评估跨平台、安全、性能和兼容性。
