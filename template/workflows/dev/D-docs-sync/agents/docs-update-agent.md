---
id: dev/D-docs-sync/docs-update-agent
type: agent
name: Docs Update Agent
description: 隔离执行 Knowledge Extract、Asset Audit & Update 与 State Write phase
---

## 使命

从归档提取知识、差量更新 tracked assets、验证后原子写回 docs-sync state。

## 输入契约

- change 路径：`speculo/.speculo/dev/<change>/`
- `current_phase` / phase-id：`asset-audit-update` 或 `state-write`
- 上游产物：`docs-sync-report.md`（diff 段已完成）
- 规范：`../knowledge-extract.md`、`../docs-sync-update.md`、`../docs-sync-finish.md`
- 契约：`../readme-contract.md`、`../agents-contract.md`、`../changelog-contract.md`、`../config-contract.md`

## 执行规范

- 按 `../knowledge-extract.md` 读取 archive 高信号产物。
- 按 `../docs-sync-update.md` 差量更新 tracked assets；术语不稳定时转交 `../../M-domain-modeling/M-domain-modeling.md`。
- 按 `../docs-sync-finish.md` 验证并原子写回 `speculo/.speculo/dev/docs-sync-state.json`。

## 产物与状态

- 产物：`docs-sync-report.md`（完整）、更新后的 tracked assets、`docs-sync-state.json`
- `.status.json`：更新 `synced_assets`、`config_audit_status`、`docs_sync_status: synced`

## 边界

- RULES.md 删除或改写须用户确认。
- 不写 `change_status`；需要收尾时移交 `../../04-finalize/04-finalize.md`。
