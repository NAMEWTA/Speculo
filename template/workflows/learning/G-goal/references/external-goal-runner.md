# 外部 /goal 执行器

本文件只在 Goal-Plan 已写成、用户把计划交给外部 AI CLI `/goal` 之后读取。G-goal 激活会话不执行本文件。

## 谁执行

执行器是用户自己的 AI CLI `/goal`，不是 Learning Work 会话内的自动编排。`plan` 写出的文档不构成执行授权。`ready_for_execution: false` 一直保持到用户把计划交给 `/goal`。计划正文里的「允许」不构成 `/goal` 之外的额外授权。

详细操作手册是当前 Change 的 `goal/goal-plan.md`。本文件只固定执行器边界。Lead 编排读 `<Path>{roots.workflows}/learning/G-goal/references/lead-orchestration.md</Path>`。

## 启动

1. 打开含 `<Path>{roots.state}/workspace.json</Path>` 的项目；roots 只来自该文件。
2. 粘贴当前 `goal-plan.md` 的 §0 `/goal` 块。
3. 按该计划 §11 最小读取清单读；不整读 archive、`inquiry/` 或其他 Change。
4. 不要重新做范围访谈。范围已冻在计划里。源码或范围变化则停止，要求用户激活 G-goal `replan`。

## 允许跟随

- `<Path>{roots.workflows}/learning/L-lesson/L-lesson.md</Path>`：写 `lessons/L-*.md`（阶段 T，每课一个 L 子代理）
- `<Path>{roots.workflows}/learning/common/skills/socratic-questioning/SKILL.md</Path>` 且 `audience=mine`：写 `goal/probes/GP-*.md`（阶段 M，每课一个 miner）

必须加载 socratic-questioning SKILL，路径固定为 `{roots.workflows}/learning/common/skills/socratic-questioning/SKILL.md`。不得另造配方。

派单不改所有权。A 仍拥有 course 地图，L 仍拥有 lessons，G 拥有 `goal/`，Q 拥有 `inquiry/`。矩阵、chain、progress、verify、`lessons/INDEX` 只有 Lead 可写。

## 禁止

- `Q-question` 的 `inquiry/` Response 协议
- 自动激活 H / R / C / A-archive
- 写 mastered
- 复活 `Q-quiz`
- 把 mine 写成学习者问答课
- 为不改变矩阵格子的主题另开课
- 发明库存里不存在的函数、容器或数据流
- 阶段 T 完成前启动 miner
- `L → mine → L → mine` 交错
- 同一 `lesson_id` 第 11 问或 `b03`
- miner 写入 `lessons/` 或 matrix
- 同一 mine unit 超过 15 节

## 循环

当前 mine unit 全部 L（阶段 T）→ 按课 mine（阶段 M）→ Lead 处置（阶段 D）→ 下一 unit。禁止交错。并行只发生在写集不相交的子代理之间。宿主没有 team 时按相同派单包顺序执行，合同不降级。

处置只允许：`re-dispatch-L` | `split-lesson` | `defer(reason)`。`mine-more` 只允许在该课尚未满 10 问、且 batch-01 已证明存在真实矩阵缺口时打开 `b02`。满 10 问后 `mine-more` 非法。

## 停止

读 `<Path>{roots.workflows}/learning/G-goal/references/stop-rules.md</Path>`。任一过程即停或完成即停触发后，写 `goal/verify.md`：哪些格子闭合、哪些 deferred、哪些仍 uncovered、恢复入口。课写完不是完成。
