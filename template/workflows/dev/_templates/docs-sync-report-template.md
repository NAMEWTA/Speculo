> **服务工作流：** `../D-docs-sync/D-docs-sync.md`
> **产物文件名：** `docs-sync-report.md`
> **父目录规则：** 本模板产物写入 `YYYY-MM-DD-<kebab-name>/` change 目录内

# Docs Sync Report

## Range

[TODO: 记录 `<LAST_SYNC_SHA>..HEAD`；bootstrap 模式写 `<bootstrap>..HEAD`，并说明本次为首次文档初始化。]

## Bootstrap Initialization

[TODO: 仅 bootstrap 模式填写：记录项目事实盘点、自动推导的 tracked assets、缺失文档清单和初始化动作；常规同步写 `N/A`。]

## Diff Summary

[TODO: 记录 git log、name-status、路径分组、archive/.config 相关 diff 摘要。]

## Archive Sources

[TODO: 列出本次读取的 `speculo/.speculo/archive/` 产物路径；没有相关归档时写 `[]` 和原因。]

## Knowledge Suggestions

[TODO: 记录从归档提取的 ADR / CONTEXT / RULES / LESSONS / 文档漂移候选，包含来源路径和动作。]

## Config Audit

[TODO: 记录 `.config` 审计结果，按 add / update / delete / keep / propose-only 分组；RULES 写入确认单独记录。]

## Mapping

[TODO: 说明哪些变更或 bootstrap 初始化发现映射到哪些 tracked assets。]

## Synced Assets

[TODO: 列出实际创建或修改的资产和一句话说明；空同步时写 `[]`。]

## Verification

[TODO: 记录运行的校验命令、结果，或无法运行原因。]

## State

[TODO: 记录 `speculo/.speculo/dev/docs-sync-state.json` 的 old/new baseline。]
