---
command: docs-sync
mode: <bootstrap|incremental|no-op>
scope: <workspace|multi-workflow|workflow>
workflows: []
changes: []
generated_at: <ISO-8601>
---

# Docs Sync Report

## Git Range

- From: `<FROM_SHA|null>`
- To: `<INPUT_HEAD>`
- Replay: `git diff <FROM_SHA>..<INPUT_HEAD>` 或 `bootstrap current facts`

## Workspace Cleanup

[记录 checkpoint commit、显式文件清单和运行前验证；无需 checkpoint 时写 `none`。]

## Confirmed Scopes

[记录全局 project targets、各 workflow project/state targets、scope revision 和本次确认变化。]

## Evidence And Lifecycle

| Target | Action | Evidence | Result |
|---|---|---|---|

## Workflow Sources

[按 workflow 记录读取的 WORKFLOW、archive、声明 store 和受保护候选；空集合写 `[]`。]

## Synced Assets

[列出实际新增、修改、合并或删除的文档与知识资产；no-op 写 `[]`。]

## Verification

[记录实际运行的命令、结果与未运行原因。]

## State

[记录全局 state 与 sidecar 的 schema、revision、pending 迁移项和原子写入结果。]
