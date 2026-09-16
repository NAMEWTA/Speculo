# G-goal 编排协议

G-goal 只在 `plan` / `replan` 中编排上游地图。授课与挖掘由外部 `/goal` 按 Goal-Plan 派单。`/goal` 采用 lead-directed：Lead 扇出、写集隔离、mine unit ≤15。细节读 `<Path>{roots.workflows}/learning/G-goal/references/lead-orchestration.md</Path>` 与 `<Path>{roots.workflows}/learning/G-goal/references/mine-unit.md</Path>`。

## 计划会话允许跟随的合同

- `I-init-setup`：没有状态时写空骨架
- `A-assess-and-plan`：写出或核对 `course.md`、background、baseline、sources、Change INDEX
- 可选只读库存员：产出 C4 与函数分组，不写状态

不得跟随：`L-lesson`、`Q-question`、`H-homework`、`R-review`、`C-consolidate`、`A-archive`。不得写 `lessons/` 或 `goal/probes/`。

## `/goal` 会话允许跟随的合同

- `L-lesson`：写 `lessons/L-*.md`（阶段 T，每课一个 writer）
- `socratic-questioning` 且 `audience=mine`：写 `goal/probes/GP-*.md`（阶段 M，每课一个 miner）

不得跟随：`Q-question` 的 `inquiry/` Response 协议、H/R/C/A-archive。

## 所有权

派单不是改写所有权。A 仍拥有 course 地图，L 仍拥有 lessons，G 拥有 `goal/`，Q 拥有 `inquiry/`。矩阵、chain、progress、verify、`lessons/INDEX` 只有 Lead 可写。

## 并发

Lead 扇出 + 写集隔离。只有写集不相交才允许并行。同一 mine unit ≤15 节。Wave 不是并发授权，也不是挖掘门。禁止「同一时间只推进一个 chain 节点」的旧交错循环；禁止因为宿主没有 team 就退回 `L → mine → L → mine`。
