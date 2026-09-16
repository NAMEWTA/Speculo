# Lead 编排与派单（Learning `/goal`）

本文件只在外部 `/goal` 执行 Goal-Plan，或 G-goal `plan` / `replan` 需要派只读库存员 / A 子代理时读取。不引入 SpecDev 的 Ticket / worktree / Evidence 协议。并发单位是「一个 Lesson 文件」或「一份 probe 文件」。

抄 SpecDev `P-goal-plan` 的 lead-directed：主会话是唯一 Lead。Learning 不把 Lead 写进 Ticket；Lead 是当前 `/goal`（或 plan）主会话。

## 角色与写集

| 角色 | 何时出现 | 可以写 | 禁止写 | 必须读取 |
| --- | --- | --- | --- | --- |
| Lead（`/goal` 主会话，或 plan 主会话） | 始终 | `goal-plan` / `chain` / `matrix` / `progress` / `verify` / `lessons/INDEX` / `learning-log` / `.status.json` | 不得代替 L 写讲义正文，不得代替 miner 编造探针 | 已打开的 `workspace.json`、Goal-Plan §0/§5/§7/§8、`<Path>{roots.workflows}/learning/G-goal/references/stop-rules.md</Path>`、本文件、`<Path>{roots.workflows}/learning/G-goal/references/mine-unit.md</Path>`、`<Path>{roots.workflows}/learning/G-goal/references/split-rules.md</Path>` |
| 库存员（只读） | plan 可选 | 无 | 任何状态与知识文件 | 目标仓库源码，产出 C4 与函数分组给 Lead |
| A 子代理 | plan 且尚无 `course.md` | `course.md`、background、baseline、sources、Change INDEX | `goal/`、`lessons/`、`probes/` | `A-assess-and-plan` 合同 |
| L 子代理 | `/goal` 阶段 T，每课一个 | 仅被分配的 `lessons/L-<NNN>-<slug>.md` | 其他 L 文件、INDEX、`goal/`、`inquiry/` | `L-lesson.md` + teaching-policy + 该课 OBJ 与矩阵行 |
| Miner 子代理 | `/goal` 阶段 M，每课一个 | 仅 `GP-<lesson>-b01.md` 与（若仍有预算）`b02.md` | `lessons/`、chain、matrix、`inquiry/`、其他课的 probe | 下面这条 skill 路径 + questioning-policy + 该课 Lesson + 源码锚点 + 该课声称覆盖的矩阵行 |

Miner 必须加载的 skill 路径（不得另造配方）：

```text
{roots.workflows}/learning/common/skills/socratic-questioning/SKILL.md
```

## 派单包最低字段

每次派单必须包含：`lesson_id` 或 change 范围、只读路径、唯一可写路径、允许动作、停止条件、返回格式。Miner 包还必须包含该课声称覆盖的矩阵行，以及上述 skill 合同路径。`audience` 固定为 `mine`。

L 返回至少：`lesson_id`、写入路径、是否满足 L 合同章节、声称覆盖的格子。Miner 返回至少：`lesson_id`、`probe_id`、`question_budget_used`、缺口表、Q5/Q10 建议（`mine-more` | `defer` | `re-dispatch-L` | `split-lesson`）、可选 `split-proposal`。Miner 只填表，不选择处置。

## 并发边界

- `learning_agent_limit` 默认 4，硬顶为 `min(本单元课数, 15, 宿主能力)`。Lead 不计入。
- 只有写集不相交才允许并行。两个 L 子代理不得写同一文件。两个 miner 不得写同一 GP 文件。
- 跨 mine unit 不得同时写课或同时挖掘。
- 矩阵、chain、progress、verify、`lessons/INDEX` 只有 Lead 可写。
- 矩阵冲突只暂停受影响格子；其他课的 T/M 继续。不得抢锁、清空或覆盖他人写集。

## 无宿主 team 时的顺序回退

宿主没有 subagent / agent team：Lead 按相同派单包顺序执行，合同不变。禁止因为不能并行就退回 `L → mine → L → mine` 交错。阶段 T 结束之前禁止任何 miner 启动。

## 计划会话

G-goal `plan` / `replan` 允许 Lead 派只读库存员，以及在没有 `course.md` 时派 A 子代理。Lead 自己写 `goal/*` 骨架，并按 mine-unit 规则切单元。计划会话仍然禁止写 `lessons/` 与 `goal/probes/`。

## HARD NO

- 不在阶段 T 完成前启动 miner
- 不交错 L 与 mine
- miner 不得写 `lessons/` 或 matrix
- miner 不得选择处置
- 同一 mine unit 不得超过 15 节
- 宿主没有 team 时，不得借机退回旧交错循环
