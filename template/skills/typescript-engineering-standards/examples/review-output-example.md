# 代码审查输出示例

## 阻塞问题

### `src/features/workspace/load-workspace.ts:42`

`JSON.parse()` 的结果被直接断言为 `WorkspaceConfig`。当配置缺少 `rootPath` 时，错误会延迟到文件系统调用，并可能访问错误位置。

建议在配置边界使用 Schema 验证，将解析函数返回类型固定为已验证的 `WorkspaceConfig`，并补充缺失字段和路径穿越测试。

## 重要问题

### `src/main/process-registry.ts:88`

关闭窗口时只移除了事件监听器，没有终止仍在运行的子进程。重复打开窗口会留下孤儿进程。

建议让注册函数返回统一 `dispose()`，在窗口关闭和应用退出两个路径都调用，并增加清理回归测试。

## 建议

### `src/features/search/utils.ts`

该文件同时包含查询解析、排序和本地存储。当前功能仍正确，但后续修改会持续扩大职责。

建议在下一次触及该模块时拆为 `search-query-parser.ts`、`search-result-sort.ts` 和 `search-history-storage.ts`。本问题不必阻塞当前仅修复文案的变更。
