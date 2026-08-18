# Engineering Standards Builder（稳定 ID：engineering-standards-builder）

这是 `template/skills/engineering-standards-builder` 的可直接替换版本。目录名和 frontmatter `name` 保持不变，以避免破坏 Speculo 当前的 Skill 清单与调用方；能力已经升级为跨语言项目工程规范生成器。

## 能力范围

- 运行前先扫描整个仓库并建立可追溯的 Project Inventory。
- 支持单项目、Workspace、Monorepo 和多语言 Monorepo。
- 内置 TypeScript/JavaScript、React、Vue、Java、Spring Boot、Go、Rust 规则包。
- 通用规则位于 `references/rules/`；语言规则物理隔离。
- 只生成当前项目实际适用的规则，不复制无关技术栈内容。
- 通过 `scripts/` 提供只读发现、manifest 校验、Builder 校验和生成结果校验。
- `examples/` 是自测试 fixture，不是装饰样例。

## 安装

删除仓库中的旧目录：

```text
template/skills/engineering-standards-builder
```

将本目录完整复制到相同位置。不要只复制 `SKILL.md`，因为 references、scripts、templates 和 examples 都是运行合同的一部分。

## 自校验

在本目录执行：

```bash
node scripts/sync-manifest.mjs --root . --check
node scripts/validate-builder.mjs --root .
node scripts/self-test.mjs --root .
```

## 生成目标

新 canonical 项目规范为：

```text
.agents/skills/engineering-standards/
```

旧的 `typescript-standards` 与 `typescript--standards` 仅作为需要时生成的单向兼容入口。这样既保留旧项目可用性，又避免继续把跨语言规范命名为 TypeScript 规范。
