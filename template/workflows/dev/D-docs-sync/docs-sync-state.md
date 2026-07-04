# State Read Phase

## 输入

- `speculo/.speculo/dev/docs-sync-state.json`
- `git rev-parse HEAD`
- `../_templates/docs-sync-state-template.json`
- `state-json-schema.md`

## 产物

- `speculo/.speculo/dev/docs-sync-state.json`
- `speculo/.speculo/dev/<change>/docs-sync-report.md`

## 填写引导

1. 设置 `STATE_FILE="speculo/.speculo/dev/docs-sync-state.json"`。
2. 读取 `state-json-schema.md`，按 schema 校验 state；若文件不存在，复制 `../_templates/docs-sync-state-template.json` 为骨架，把 `state_path` 设为 `speculo/.speculo/dev/docs-sync-state.json`。
3. 若存在 v1 state（`schema_version: 1` 或含 `tracked_docs` / `synced_docs`），迁移为 v2：
   - `tracked_assets = tracked_docs`
   - `synced_assets = synced_docs`
   - 保留所有 baseline 字段
   - `schema_version = 2`
   - 在 report 中记录迁移摘要
4. 读取 `last_sync_sha` 和当前 `HEAD`。
5. 若 `tracked_assets` 为空、`last_sync_sha` 为 `null` 或 state 文件刚由模板创建，设置 `BOOTSTRAP_DOCS_INIT=true`，把 `.status.json` 的 `docs_sync_status` 置为 `bootstrap`，本次默认执行从 0 到 1 的完整文档初始化。
6. `bootstrap` 模式下自动推导首批 `tracked_assets`，不因缺少用户确认而停止；候选至少包括：
   - 基础文档：`README.md`、`CHANGELOG.md`、`AGENTS.md`，以及项目已存在或明显需要的 `CLAUDE.md` / `.github/copilot-instructions.md`。
   - 文档目录：已存在的 `docs/**/*.md`；若项目有复杂架构、CLI/API、发布流程或接入说明但缺少承载文档，可把待创建的 `docs/*.md` 纳入初始化候选。
   - Speculo 知识资产：实际存在的 `speculo/.speculo/.config/RULES.md`、`speculo/.speculo/.config/LESSONS.md`、`speculo/.speculo/.config/context/**/*.md`、`speculo/.speculo/.config/adr/**/*.md`。
7. `bootstrap` 模式的初始化目标是：基于当前项目真实文件、元数据、命令、入口、测试、CI 和发布配置，创建或补齐首批可维护文档，并把本次创建/更新的路径写入 report 与最终 state。
8. `RULES.md` 只审计和提出建议，写入需用户明确确认；`.config/context` 和 `.config/adr` 中不稳定、多语义或需要取舍的内容，先交由 `../M-domain-modeling/M-domain-modeling.md` 确认。
9. 若已存在有效 `tracked_assets` 且 `last_sync_sha == HEAD`，仍执行 archive 和 `.config` 审计；只有审计也无变化时才报告无需操作。

## 边界

- 不把 state 写到仓库根目录。
- 首次空 state 不等待用户确认 `tracked_assets`；必须自动进入 `bootstrap` 初始化，并在 report 中说明推导依据。
- 不因 v1 迁移自动扩大已有同步范围；只有迁移后 `tracked_assets` 为空或 `last_sync_sha` 为 `null` 时才进入 `bootstrap`。
- 不在 State Read 阶段直接推进 `last_sync_sha`；基线只在 Finish 阶段验证通过后写回。
- 不在未确认时写入 `RULES.md`、删除 `.config` 文件或固化存在语义争议的 CONTEXT / ADR。

## 完成准则

- 已确定是否进入 `bootstrap`、无需同步或继续进入 diff collect
- v1 state 已迁移为 v2，或已明确阻塞原因
- `.status.json` 的 `docs_sync_status` 已更新
