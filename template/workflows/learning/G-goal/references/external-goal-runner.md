# 外部 /goal 执行器

本文件只在 Goal-Plan 已写成、用户把计划交给外部 AI CLI `/goal` 之后读取。G-goal 激活会话不执行本文件。

## 谁执行

执行器是用户自己的 AI CLI `/goal`，不是 Learning Work 会话内的自动编排。`plan` 写出的文档不构成执行授权。`ready_for_execution: false` 一直保持到用户把计划交给 `/goal`。计划正文里的「允许」不构成 `/goal` 之外的额外授权。

详细操作手册是当前 Change 的 `goal/goal-plan.md`。本文件只固定执行器边界。

## 启动

1. 打开含 `<Path>{roots.state}/workspace.json</Path>` 的项目；roots 只来自该文件。
2. 粘贴当前 `goal-plan.md` 的 §0 `/goal` 块。
3. 按该计划 §11 最小读取清单读；不整读 archive、`inquiry/` 或其他 Change。
4. 不要重新做范围访谈。范围已冻在计划里。源码或范围变化则停止，要求用户激活 G-goal `replan`。

## 允许跟随

- `<Path>{roots.workflows}/learning/L-lesson/L-lesson.md</Path>`：写 `lessons/L-*.md`
- `<Path>{roots.workflows}/learning/common/skills/socratic-questioning/SKILL.md</Path>` 且 `audience=mine`：写 `goal/probes/GP-*.md`

派单不改所有权。A 仍拥有 course 地图，L 仍拥有 lessons，G 拥有 `goal/`，Q 拥有 `inquiry/`。

## 禁止

- `Q-question` 的 `inquiry/` Response 协议
- 自动激活 H / R / C / A-archive
- 写 mastered
- 复活 `Q-quiz`
- 把 mine 写成学习者问答课
- 为不改变矩阵格子的主题另开课
- 发明库存里不存在的函数、容器或数据流

## 循环

一节课 → 一次 mine → 更新矩阵与 `progress.md`。默认 current、严格串行。同一时间只推进一个 chain 节点。Wave 不是并发授权。

处置只允许：`mine-more` | `defer(reason)` | `re-dispatch-L`。

## 停止

读 `<Path>{roots.workflows}/learning/G-goal/references/stop-rules.md</Path>`。任一过程即停或完成即停触发后，写 `goal/verify.md`：哪些格子闭合、哪些 deferred、哪些仍 uncovered、恢复入口。课写完不是完成。
