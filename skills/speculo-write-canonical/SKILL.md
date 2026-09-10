---
name: speculo-write-canonical
description: 编译或审计 Speculo canonical 单文件；仅在 skill、command、work 或 workflow 的可移植持久化语义、静态依赖闭包或隔离验证需要改变时使用。
---

# Speculo Write Canonical

Canonical 是从源能力编译的独立分发物，不是第二份业务事实源；必须保留可恢复工件和持久化合同。

## 读取

先读 [`../_shared/authoring-protocol.md`](../_shared/authoring-protocol.md)、[`../_shared/project-model.md`](../_shared/project-model.md)、[`../_shared/path-and-reference-rules.md`](../_shared/path-and-reference-rules.md)、[`../_shared/authoring-quality.md`](../_shared/authoring-quality.md) 和 [`references/canonical-contract.md`](references/canonical-contract.md)，再定位唯一源入口及其静态依赖。不要把 canonical 当作源，也不要默认读取无关 workflow。

## 路由

1. 建立源入口、静态依赖、产物 owner、状态/恢复键和平台可写/不可写模式清单。
2. 去除源路径、frontmatter、内部 alias、manifest 和 provenance；将运行时产物映射到 canonical 自己的持久化命名空间。
3. 使用 `skills/speculo-write-canonical/scripts/build-canonical.mjs` 构建、审计和 self-check；项目 canonical 使用 `pnpm generate-canonical`。
4. 解压到空目录复核完整文件包，再运行整目录审计；源变化后只从源重建。

## 停止条件

依赖未闭合、内部路径泄漏、持久化能力缺失、URL/manifest/frontmatter 违反隔离合同、路径穿越或审计失败时停止。
