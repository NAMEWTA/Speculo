# G-goal 规划模式

本文件只在激活 G-goal 后按模式读取。

## plan（默认）

写出完整 Goal-Plan、Chain、覆盖矩阵和进度骨架，并可跟随 A 合同写 `course.md` / background / baseline / sources。不写 `lessons/`，不写 `goal/probes/`，不提问学习者。`ready_for_execution: false`。计划正文不授权执行。

## replan

源码、范围或用户目标变化时重编译。旧 `goal-plan.md` 移入 `goal/revisions/REV-<NNN>.md` 只读。已写成且仍覆盖有效格子的 Lesson 不删除；失效格子改 `deferred` 或重新入链。

## run / resume

不由本 Work 在激活会话内执行。执行器是用户的外部 `/goal`，合同见 `<Path>{roots.workflows}/learning/G-goal/references/external-goal-runner.md</Path>` 与当前 `goal-plan.md` §5 / §8。

## verify

对照矩阵与 `verify.md` 验收。课写完不是完成。可由 `/goal` 在停止规则触发后执行；以后再激活 G-goal 时也可以只读验收，仍不得补写 Lesson 或 probe，除非用户明确改回 `replan` 或把计划交给 `/goal`。
