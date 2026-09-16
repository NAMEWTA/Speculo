# G-goal 编排协议

G-goal 只在 `plan` / `replan` 中编排上游地图。授课与挖掘由外部 `/goal` 按 Goal-Plan 派单。

## 计划会话允许跟随的合同

- `I-init-setup`：没有状态时写空骨架
- `A-assess-and-plan`：写出或核对 `course.md`、background、baseline、sources、Change INDEX

不得跟随：`L-lesson`、`Q-question`、`H-homework`、`R-review`、`C-consolidate`、`A-archive`。

## `/goal` 会话允许跟随的合同

- `L-lesson`：写 `lessons/L-*.md`
- `socratic-questioning` 且 `audience=mine`：写 `goal/probes/GP-*.md`

不得跟随：`Q-question` 的 `inquiry/` Response 协议、H/R/C/A-archive。

## 所有权

派单不是改写所有权。A 仍拥有 course 地图，L 仍拥有 lessons，G 拥有 `goal/`，Q 拥有 `inquiry/`。

## 并发

默认 current、严格串行。同一时间只推进一个 chain 节点。Wave 不是并发授权。
