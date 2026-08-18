# 语言适配器与未内置语言 Fallback

## 适配器组成

新增语言或框架支持必须同时提供：

```text
references/<language>/00-detection-and-scope.md
references/<language>/... language rules
examples/<language>/<fixture>/
discover-project.mjs detection signals
self-test.mjs assertions
SKILL.md routing pointer
manifest entry
```

框架、运行时和应用类型放在语言目录下的 `frameworks/`、`runtimes/`、`app-types/`，不要污染通用规则。

## Detection

检测至少交叉使用两类信号：

- manifest/build/toolchain；
- 源文件与入口；
- CI/build 命令；
- 框架依赖或注解；
- 官方目录/模块配置。

仅文件扩展名通常为 medium confidence；manifest + 源码入口可为 high confidence。

## 语言规则最小覆盖

- 模块/package/crate 与 public API；
- 命名和目录；
- 类型/错误/资源/并发；
- 测试布局和工具；
- formatter、lint/static analysis、build；
- 版本与兼容策略；
- 官方依据；
- 语言专属访谈触发条件。

## 未内置语言

发现 Python、Kotlin、C#、C/C++ 或其他语言而没有内置适配器时：

1. 仍生成通用规则；
2. 从仓库事实提取真实 formatter/linter/test/build 命令；
3. 保留现有目录和语言惯例；
4. 将语言专属规则标记为 `pending-adapter`；
5. 不把 TypeScript、Java、Go 或 Rust 模式套用；
6. 必要时按本合同构建新适配器。

## 完成条件

适配器能被发现、选择、生成和测试；无触发项目不会加载它；其 examples 被 self-test 实际使用。
