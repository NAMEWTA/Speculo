# 注释、JSDoc 与文档

## 注释解释原因

注释用于解释代码本身无法清楚表达的：

- 为什么必须采用此顺序。
- 为什么不能删除看似多余的逻辑。
- 平台、协议、性能或安全约束。
- 第三方缺陷和规避方案。
- 竞态条件和资源生命周期。
- 非直观产品规则。

不应逐行翻译代码。

```ts
// 不推荐：Increment retry count.
retryCount += 1

// 推荐：Provider replication can briefly return 409 after a successful write.
retryCount += 1
```

## 注释风格

- 优先一行或一个短段落。
- 靠近被解释的逻辑。
- 使用完整、可验证的原因。
- 修改实现时同步更新。
- 能用命名和拆分表达时，不靠注释补救。

## 应写注释的场景

- 跨平台差异。
- 第三方类型或运行时缺陷。
- 兼容旧协议的临时分支。
- 性能关键路径的非直观优化。
- 安全检查顺序。
- 并发和竞态约束。
- 清理顺序。
- 特殊算法或领域公式。

## 不应写的注释

- 复述变量名或控制流。
- 注释掉的旧代码。
- 无跟踪信息的“以后优化”。
- 与实现重复的大篇教程。
- 无法验证的猜测。

历史实现由版本控制保存，不应长期留在源码中。

## JSDoc 使用范围

JSDoc 主要用于：

- 公共库 API。
- 插件和扩展点。
- 跨团队或跨进程契约。
- 参数具有单位、边界或特殊格式。
- 函数有重要副作用、取消、异常或线程安全语义。

```ts
/**
 * Resolves a workspace path without following symbolic links.
 *
 * @throws {WorkspacePathError} When the path escapes the configured root.
 */
export function resolveWorkspacePath(
  rootPath: string,
  candidatePath: string
): string {
  // ...
}
```

内部显而易见的函数不需要机械补全 JSDoc。

## TODO

TODO 必须包含负责人约定或可追踪编号，并说明删除条件：

```ts
// TODO(PROJ-1423): Remove after all clients send protocol v3.
```

禁止：

```ts
// TODO: fix later
```

## 设计文档

以下内容更适合放入 `docs/` 或 ADR，而非源码注释：

- 多方案权衡。
- 跨服务架构。
- 数据迁移计划。
- 兼容性策略。
- 长期安全模型。
- 复杂协议说明。

源码注释可以引用相应 ADR 或问题编号，但应保留理解当前代码所需的最小上下文。
