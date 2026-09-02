# Engineering Standards Builder

稳定 Skill ID：`engineering-standards-builder`。

这是一个由用户手动启动的项目规范生成器。它先审计当前项目的代码、目录、配置、测试、CI 与模板，再把证据编译为持久化在 `.agents/skills/` 的最小项目 Skill Set。

核心产物是 `.agents/skills/engineering-standards/` 根路由和按需生成的领域 Skill。Builder 通过 `generated-skill-set.json` 记录所有权；刷新只管理清单内路径，不接管用户维护的其他 Skill。

内置 TypeScript/JavaScript、React、Vue、Java、Spring Boot、Go 与 Rust references 只提供发现与审计 fallback。项目代码、模板、测试、配置、CI 及用户决定始终优先。

## 自校验

在本目录执行：

```bash
node scripts/sync-manifest.mjs --root . --check
node scripts/validate-builder.mjs --root .
node scripts/self-test.mjs --root .
```

`examples/` 是扫描器与生成结果验证器的 fixtures，不是复制到项目中的示例工程。
