# External /goal runner contract

- 执行器是用户的外部 AI CLI `/goal`，不是 G-goal 激活会话。
- `/goal` 读取已编译 `goal/goal-plan.md`，不重新访谈 scope。
- 允许跟随：`L-lesson`，然后 `socratic-questioning`（`audience=mine`）。
- 禁止：`Q-question` inquiry `Response` 协议、`H/R/C/A-archive`、`mastered`、`Q-quiz`。
- 所有权不变：`goal/` 仍归 G-goal，`inquiry/` 仍归 Q-question。
- 命中 stop-rules 即停止，并写 `goal/verify.md`。
- `ready_for_execution` 在用户把计划交给 `/goal` 前保持 `false`。
