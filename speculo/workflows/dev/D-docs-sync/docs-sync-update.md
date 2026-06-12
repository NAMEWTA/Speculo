# Docs Update Phase

## 输入

- `speculo/.speculo/dev/<change>/docs-sync-report.md`
- state 中的 `tracked_docs`
- git 差异素材
- 按需读取的 contract 文件

## 产物

- 更新后的 tracked docs
- `speculo/.speculo/dev/<change>/docs-sync-report.md`

## 填写引导

1. 更新 README 类文档前读取 `readme-contract.md`。
2. 更新 AGENTS / AI 代理手册类文档前读取 `agents-contract.md`。
3. 更新 CHANGELOG 类文档前读取 `changelog-contract.md`。
4. 所有文档只做差量修改，保留既有结构、语气和字段。
5. 多语言镜像文档必须结构对等；代码实体不翻译。
6. CHANGELOG 顶部必须保留 `[Unreleased]`。
7. AGENTS 类的仓库布局小节必须反映实际顶层目录变化。

## 边界

- 不整页重写 README 或代理手册。
- 不添加没有对应代码来源的计划中能力。
- 不把 docs-sync state 放回 skill 或 workflow 目录。

## 完成准则

- 需要同步的 tracked docs 已完成差量修改
- `docs-sync-report.md` 记录每个文档的修改理由和摘要
- `docs-sync-report.md` 无残留 `[TODO:]`
