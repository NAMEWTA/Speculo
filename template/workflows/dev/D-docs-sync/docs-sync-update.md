# Asset Audit & Update Phase

## 输入

- `speculo/.speculo/dev/<change>/docs-sync-report.md`
- state 中的 `tracked_assets`
- git 差异素材
- archive 知识提取结果
- 按需读取的 contract 文件

## 产物

- 更新后的 tracked assets
- `speculo/.speculo/dev/<change>/docs-sync-report.md`

## 填写引导

1. 若当前为 `bootstrap` 模式，先把初始化候选写入 report 的 Mapping，再按候选更新最终 `tracked_assets`；缺失的基础文档可作为 `add` 创建。
2. 更新 README 类文档前读取 `readme-contract.md`。
3. 更新 AGENTS / AI 代理手册类文档前读取 `agents-contract.md`。
4. 更新 CHANGELOG 类文档前读取 `changelog-contract.md`。
5. 更新 `.config` 前读取 `config-contract.md`；涉及术语或 ADR 语义时读取 `../M-domain-modeling/M-domain-modeling.md`，按需读取其 `CONTEXT-FORMAT.md` / `ADR-FORMAT.md`。
6. 常规同步只做差量修改，保留既有结构、语气和字段；`bootstrap` 模式创建缺失文档时，可按 contract 生成完整初始骨架。
7. 每个候选改动都按 `add | update | delete | keep | propose-only` 标记，并写入 report；不允许只追加不审计。
8. 多语言镜像文档必须结构对等；代码实体不翻译。
9. CHANGELOG 顶部必须保留 `[Unreleased]`；首次创建 CHANGELOG 时使用 Keep a Changelog 骨架，并只记录当前已存在事实。
10. AGENTS 类的仓库布局小节必须反映实际顶层目录变化；首次创建 AGENTS 类文档时面向 AI 代理写工作手册，不写用户 Quick Start。
11. `RULES.md` 只写 report 建议；用户明确确认后才可修改文件。
12. `LESSONS.md` 只保留可复用、已验证、非重复的经验；空占位、重复项和只适用于单次任务的内容应删除或不写入。
13. ADR / CONTEXT 更新前先判断是否是领域语义变化；不稳定、多语义或存在冲突时，必须交由 `../M-domain-modeling/M-domain-modeling.md` 询问确认。

## 边界

- 常规同步不整页重写 README 或代理手册；`bootstrap` 模式只在文件缺失时创建完整初始文件，已有文件仍以审计和差量修订为主。
- 不添加没有对应代码来源的计划中能力。
- 不把 docs-sync state 放回 skill 或 workflow 目录。
- 不自动删除 `.config` 文件；删除候选进入 report 或 `../../../commands/config-prune.md` dry-run，执行删除需要用户确认。
- 不把归档产物正文大段复制到长期文档；只沉淀可复用结论，并保留路径引用。

## 完成准则

- 需要同步的 tracked assets 已完成差量修改、`bootstrap` 初始化创建或明确列为 propose-only
- `docs-sync-report.md` 记录每个资产的修改理由、生命周期动作和摘要
- `docs-sync-report.md` 无残留 `[TODO:]`
