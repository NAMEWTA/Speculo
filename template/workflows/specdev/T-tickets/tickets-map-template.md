---
schema_version: 3
artifact: tickets-map
change: <YYYY-MM-DD-topic>
status: draft
---

# Tickets Map: <工作名称>

- **Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **Ticket 目录：** `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`
- **Evidence 目录：** `<Path>{roots.state}/specdev/changes/{change}/evidence/</Path>`
- **可选 Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`

## 1. 目标与拆分策略

引用主要用户故事、验收合同和架构决策，说明所有 Ticket 共同交付的目标、切片原则、prefactor 和 expand-contract 选择。不要复制整个 Spec。

## 2. 执行清单

| ID | Ticket | 可观察产出 | Blocked By | Depth | Risk | Ready | Owner | Contract IDs | Wave/Gate | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| T-01 | `<Path>{roots.state}/specdev/changes/{change}/ticket/01-<ticket-name>.md</Path>` | ... | — | standard | medium | yes | unassigned | AC-001 | — | ready |

Ticket frontmatter 是状态、依赖、深度和路径访问契约的权威；本表是同步投影，不得独立修改出另一套真相。

## 3. 依赖 DAG

```text
T-01 [READY]
  ├─→ T-02
  └─→ T-03
        └─→ T-04
```

每条边必须表示真实开始条件。标记关键汇合点、prefactor、expand、migrate、observe、contract 和集成验证点。

## 4. 合同覆盖矩阵

| Contract ID | 覆盖 Ticket | 验证接缝 | 状态 | 说明 |
|---|---|---|---|---|
| AC-001 | T-01 | ... | covered | ... |

`uncovered` 必须修复；`deferred` 必须有用户批准、原因和后续归属。

## 5. 并行与路径所有权

- 最大并发来自 `<Path>{roots.state}/specdev/config.json</Path>`。
- shared owner 为专用 Ticket 或明确的集成 owner；只有委派 Goal Plan 才使用 Lead 角色。
- 项目路径契约以 Ticket frontmatter 为准。
- 并行写代码的 Ticket 使用独立 worktree；只读调查不需要。

| Ticket A | Ticket B | Writable 交集 | 真实依赖 | 处理 |
|---|---|---|---|---|
| T-02 | T-03 | 无 | 否 | 可并行 |

## 6. Gate、Wave 与集成点

T-tickets 可以标注候选 Wave 和行为里程碑。需要正式跨 Ticket 编排时，由 `<Path>{roots.workflows}/specdev/P-goal-plan/P-goal-plan.md</Path>` 完成 Gate、Wave、owner、发布与恢复，并把结果投影回本 Map。

## 7. 横切契约与风险

只记录跨多个 Ticket 的数据、安全、兼容、共享接口、迁移、发布和恢复规则。单 Ticket 规则留在具体 `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>`。

## 8. 同步规则

- Ticket 状态变化后同步执行清单；
- Ticket ID、路径、依赖或 frontmatter 不一致时，以 Ticket 文件为权威并修复本 Map；
- Goal Plan 存在时，Wave、Gate 和 owner 以 `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>` 为编排权威；
- 依赖、合同覆盖或路径所有权变化后运行 `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>`；
- 内部工件不得使用相对 Markdown 链接。
