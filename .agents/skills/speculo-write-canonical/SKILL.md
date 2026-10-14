---
name: speculo-write-canonical
description: 编译或审计 Speculo canonical 单文件；仅在 skill、command、work 或 workflow 的可移植持久化语义、静态依赖闭包或隔离验证需要改变时使用。
---

# Speculo Write Canonical

Canonical 是从源能力编译的独立分发物，不是第二份业务事实源；必须保留可恢复工件和持久化合同。

## 读取

先定位本次目标、真实调用方和相关验证。纯文字修正核对局部事实即可；结构或行为变化时使用 [作者协议](../_shared/authoring-protocol.md)，按其中条件选择共享参考，不默认通读整个仓库。静态依赖闭包、隔离分发或持久化语义变化时读 [canonical 合同](references/canonical-contract.md)，定位唯一源与受影响生成器。 已加载且未变化的规则可复用。

## 路由

1. 建立源入口、静态依赖、产物 owner、状态/恢复键和平台可写/不可写模式清单。
2. 去除源路径、frontmatter、内部 alias、manifest 和 provenance；将运行时产物映射到 canonical 自己的持久化命名空间。
3. 使用 `.agents/skills/speculo-write-canonical/scripts/build-canonical.mjs` 构建、审计和 self-check；项目 canonical 使用 `pnpm generate-canonical`。
4. 解压到空目录复核完整文件包，再运行整目录审计；源变化后只从源重建。

## 停止条件

依赖未闭合、内部路径泄漏、持久化能力缺失、URL/manifest/frontmatter 违反隔离合同、路径穿越或审计失败时停止受影响分支，继续独立且已授权的工作。
