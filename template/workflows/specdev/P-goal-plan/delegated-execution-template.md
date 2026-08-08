## Delegated Execution Addendum

### Delivery Contract

| 字段 | 值 |
|---|---|
| Execution model | native-subagent / external-web-subagent |
| Lead / Provider | `<owner>` / `<provider>` |
| Repository / Branch | `<repository-or-local>` / `<branch>` |
| Checkpoint policy | immutable SHA / equivalent fixed baseline |
| Source delivery | repository-url / source-package / combination |
| Max concurrency / corrections | `<n>` / `3` |
| Review | standards + spec + Lead verification + conditional E2E |

### Per-Ticket Dispatch Packets

#### Dispatch: T-01

- **Goal / observable result：**
- **Priority on conflict：** correctness > contract completeness > speed，或当前项目裁决
- **Implement / Ticket：** `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>`；`<Path>{roots.state}/specdev/changes/{change}/ticket/01-<name>.md</Path>`
- **Authority / dependencies：** 相关合同、ADR/CONTEXT、已完成依赖 Evidence
- **Wave / Gate / hard constraints：**
- **Writable / read-only / shared owner：**
- **Baseline / branch / workspace or session locator / package hash：**
- **Preflight receipt：** 在 `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>` 记录目标、顺序、最大风险和基线差异，不超过 10 行
- **Verification / baseline / reverse check：**
- **Authorization / deviation / correction limit：**
- **Return：** 状态、Evidence、locator、最终 checkpoint、commit/PR、未验证项、待 Lead E2E

### Candidate Delivery Return and Lead Integration

Worker 将 Ticket 推进到 `review` 并返回候选交付；Lead 负责独立验证、适用 E2E、集成、Gate 关闭和 worktree 收尾。达到修正上限时保留最后可信 checkpoint、失败命令、已通过行为和恢复条件。
