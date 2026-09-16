---
schema_version: 1
artifact: learning-goal-plan
ready_for_execution: false
orchestration: external-goal
coverage_domain: programming
wave_cap: 8
max_waves: 2
---

# Goal-Plan: <topic>

## §0 Paste-ready /goal block

```text
/goal
Outcome: <what must be true when done>
verification surface: <goal/coverage-matrix.md + goal/progress.md + goal/probes/ + goal/verify.md>
constraints: <time/stack/risk constraints>
boundaries: <in-scope / out-of-scope>
iteration policy: one chain node at a time; stop if no matrix-cell change
blocked-stop: follow <Path>{roots.workflows}/learning/G-goal/references/stop-rules.md</Path>
```

## §1 Outcome and Authority

- Outcome 只用可核对结果表达，不写主观掌握。
- 本计划是编译产物；执行者是外部 `/goal`，不是 G-goal 激活会话。
- roots 解析以 `<Path>{roots.state}/workspace.json</Path>` 为准。

## §2 Scope

- In-scope: <modules/APIs>
- Out-of-scope: <modules/APIs>
- `covered-by-parent`: helper、生成代码、测试夹具等可由父单元覆盖，不单开课。

## §3 Coverage Contract (four-axis)

- (a) 函数目的（in-scope 函数/公开 API）
- (b) 方法性状（副作用、失败路径、幂等/并发、纯/不纯）
- (c) 业务架构（Context/Container）
- (d) 数据流（主路径 + 失败路径）

状态只允许：`uncovered | covered | deferred(reason) | covered-by-parent`。

## §4 Chain and Waves

- Chain 文件：`<Path>{roots.state}/learning/changes/{change}/goal/chain.md</Path>`
- 覆盖矩阵：`<Path>{roots.state}/learning/changes/{change}/goal/coverage-matrix.md</Path>`
- 进度：`<Path>{roots.state}/learning/changes/{change}/goal/progress.md</Path>`
- 每波上限 `wave_cap=8`，最多 `max_waves=2`，严格串行推进。

## §5 Dispatch Recipe

1. `/goal` 先派单 `L-lesson`（写 `lessons/L-*.md`）。
2. 再派单 `socratic-questioning` with `audience=mine`（写 `goal/probes/GP-*.md`）。
3. probe 只审问已写 Lesson 与源码；更新矩阵/进度；必要时再派单 L 改写。

## §6 Gates and DoD

- Gate：每次写入必须改变至少一个矩阵格子，否则按 stop-rules 停止。
- DoD：in-scope 格子全部闭合（covered / deferred / covered-by-parent）并写出 `goal/verify.md`。
- 课写完不等于完成；文件巡览结束不等于完成。

## §7 Authorization Matrix

| 会话 | 允许写入 | 禁止 |
| --- | --- | --- |
| 计划会话（激活 G-goal） | `goal/goal-plan.md`、`goal/chain.md`、`goal/coverage-matrix.md`、`goal/progress.md` 骨架 | 写 `goal/probes/`、写 Lesson、写 inquiry、自动激活 H/R/C/A |
| `/goal` 会话（外部执行） | 读取计划；按 §5 写 Lesson 与 `goal/probes/`；更新矩阵/进度；写 `goal/verify.md` | 改写计划权限边界、重做范围访谈、写 Q-question Response 协议 |

## §8 HARD NO

- no Q-quiz revival
- mine is not learner Q/A
- no inquiry/ Response protocol
- no mastered
- no auto H/R/C/A-archive
- Path{} only
- roots from workspace.json
- do not invent functions

## §9 Resume Protocol

- 恢复先读：`goal/goal-plan.md` §10、`goal/progress.md`、`goal/coverage-matrix.md`、最近 probe。
- 若 stop-rules 命中，立刻停并写 `goal/verify.md`。
- `ready_for_execution` 在用户把计划交给 `/goal` 前保持 `false`。

## §10 Progress

- 只记录可核对事实：波次、门、写入文件、矩阵变化、阻塞原因。
- 不写主观百分比，不写掌握结论。

## §11 Minimum read order

1. `<Path>{roots.state}/workspace.json</Path>`
2. `<Path>{roots.workflows}/learning/README.md</Path>`
3. `<Path>{roots.state}/learning/changes/{change}/goal/goal-plan.md</Path>`（首次编译时用本模板）
4. `<Path>{roots.workflows}/learning/G-goal/references/external-goal-runner.md</Path>`
5. `<Path>{roots.workflows}/learning/G-goal/references/coverage-bar.md</Path>`
6. `<Path>{roots.workflows}/learning/G-goal/references/stop-rules.md</Path>`
