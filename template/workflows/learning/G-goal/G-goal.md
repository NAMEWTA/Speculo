---
id: learning/goal
type: workflow-entry
workflow: learning
name: 目标学习（目标模式）
description: 为选定编程项目编译一份可被外部 /goal 执行的完整 Goal-Plan；计划会话可跟随 A 写出课程地图并按库存切 ≤15 的 mine unit，但不写 Lesson、不向学习者提问、不自动串联 H/R/C。
keywords: [goal, 目标模式, 目标学习, chain, coverage, mine, plan, mine-unit]
---

# 目标学习（目标模式）

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/learning/README.md</Path>`。

G-goal 是计划编译器，不是授课编排器。激活后写出完整 Goal-Plan 并停止。授课、挖掘与验收由用户在 AI CLI 中 `/goal` 读取该计划执行：按项目规模划出一个不超过 15 节的教学单元 → 先把这个单元的课全部写完 → 再为每一课派 miner。

## 读取范围

1. 先读取 `<Path>{roots.workflows}/learning/README.md</Path>` 与当前 Work 的状态入口。
2. 再读取 `<Path>{roots.workflows}/learning/common/rules/activation-and-memory.md</Path>`，按当前 Change、项目路径和关键词定位最小相关工件。
3. 只在本 Work 明确要求恢复、冲突、执行安全、创建 Change 或归档证据时扩展为全量读取；缺少匹配证据或 owner/gateway 时停止受影响分支。

## 模式

| 用户意图 | 模式 | 谁执行 | 必须按需读取 |
| --- | --- | --- | --- |
| 选定项目并生成完整计划（默认） | `plan` | 本 Work | `<Path>{roots.workflows}/learning/G-goal/planning-modes.md</Path>`、`<Path>{roots.workflows}/learning/G-goal/goal-plan-template.md</Path>`、`<Path>{roots.workflows}/learning/A-assess-and-plan/A-assess-and-plan.md</Path>`、`<Path>{roots.workflows}/learning/G-goal/references/mine-unit.md</Path>` |
| 源码或范围变化，重编译计划 | `replan` | 本 Work | 同上，加 `<Path>{roots.workflows}/learning/G-goal/orchestration-protocol.md</Path>`；旧 `goal-plan.md` 只读归档到 `goal/revisions/` |
| 按计划写课与挖掘 | `run` / `resume` | 外部 `/goal` | 计划正文 §5 / §8；本 Work 不在激活会话内执行 |
| 对照矩阵验收 | `verify` | 外部 `/goal`，或以后再激活本 Work 只读验收 | 计划正文 §6 与 `<Path>{roots.workflows}/learning/G-goal/references/stop-rules.md</Path>` |

`plan` 写出的文档不构成执行授权。`ready_for_execution: false`，直到用户把计划交给 `/goal`。

## 流程

1. 解析 roots 与 Learning v2 状态。roots 必须来自已打开的 `<Path>{roots.state}/workspace.json</Path>`。若尚无 `status.json` / `locations.json`，先按 `<Path>{roots.workflows}/learning/I-init-setup/I-init-setup.md</Path>` 写入空状态骨架，不创建知识条目。
2. 范围访谈一次只问一个缺口：项目路径、in-scope 模块/公开 API、out-of-scope、`expression_level`、`coverage_depth`。用户已答过不重复问。
3. 创建或恢复 `YYYY-MM-DD-<kebab-topic>[-NN]` Change，生成 `.status.json`，设置 `phase=planning`、`current_work=learning/goal`。
4. 读取目标仓库，做编程库存：C4 Context + Container、公开入口、主数据存储、一条主路径与一条失败路径、按模块归组的范围内函数。琐碎 helper、生成代码、测试夹具标 `covered-by-parent` 或 `deferred`，不为它们开课。Lead 可派只读库存员。
5. 若本 Change 尚无可用 `course.md`，跟随 `<Path>{roots.workflows}/learning/A-assess-and-plan/A-assess-and-plan.md</Path>` 写出 `course.md`、`background/foundation.md`、`baseline.md`、`sources.md` 和 Change `INDEX.md`。这些文件仍归 A 所有；本 Work 只在编译计划时走 A 合同。已有课程地图则核对，不默默重写。
6. 按模板写出完整计划，禁止留下「待调研」章节，禁止预写探针题目或深化讲义；按库存把课装进 mine unit（每个 ≤15 节，写入 `chain.md` Units 表）：
   - `<Path>{roots.state}/learning/changes/{change}/goal/goal-plan.md</Path>`
   - `<Path>{roots.state}/learning/changes/{change}/goal/chain.md</Path>`
   - `<Path>{roots.state}/learning/changes/{change}/goal/coverage-matrix.md</Path>`
   - `<Path>{roots.state}/learning/changes/{change}/goal/progress.md</Path>`（检查点骨架）
7. 计划必须内嵌可粘贴的 `/goal` 启动块，并列出最小读取清单。覆盖规则读 `<Path>{roots.workflows}/learning/G-goal/references/coverage-bar.md</Path>`；停止规则读 `<Path>{roots.workflows}/learning/G-goal/references/stop-rules.md</Path>`；执行器合同读 `<Path>{roots.workflows}/learning/G-goal/references/external-goal-runner.md</Path>`。
8. 设置 `ready_for_execution: false`。更新 `learning-log.md` 与 Change `.status.json`：`works_run` 追加 `learning/goal`，清空 `current_work`。向用户打印 Goal-Plan 路径和 `/goal` 粘贴块。
9. 停止。不写 `lessons/`，不写 `goal/probes/`，不创建 `inquiry/` 批次，不自动激活 L/H/R/C/A-archive，不写 mastered。

## 完成标准

- `goal/goal-plan.md` 按模板填实 Outcome、范围、四轴合同、Chain、Wave、mine unit、派单菜谱、授权矩阵、DoD、HARD NO、Resume 和最小读取清单；
- `course.md` 有可观察 OBJ；`chain.md` 与矩阵使用库存得到的真实模块名，不是占位符；
- `chain.md` 有 mine unit 列表，每个 unit ≤15（`mine_unit_cap`）；小项目允许远小于 15；不得为凑满 15 而灌水开课；
- 计划不得预写探针题目或深化讲义；
- 计划会话结束时 `lessons/` 仍无讲义正文（只允许空 INDEX）；
- 粘贴块含 Outcome、verification surface、constraints、boundaries、iteration policy（teach-then-mine、10 问上限、`split-lesson`、Lead 扇出、unit ≤15）、blocked-stop；
- 文档中的「允许」不构成 `/goal` 之外的额外授权；
- 不复活 `Q-quiz`，不把 mine 写成学习者问答课。

## 子文件

- 计划模板：`<Path>{roots.workflows}/learning/G-goal/goal-plan-template.md</Path>`
- Chain 模板：`<Path>{roots.workflows}/learning/G-goal/chain-template.md</Path>`
- 覆盖矩阵模板：`<Path>{roots.workflows}/learning/G-goal/coverage-matrix-template.md</Path>`
- 挖掘模板：`<Path>{roots.workflows}/learning/G-goal/probe-template.md</Path>`
- 进度模板：`<Path>{roots.workflows}/learning/G-goal/progress-template.md</Path>`
- 模式：`<Path>{roots.workflows}/learning/G-goal/planning-modes.md</Path>`
- 编排：`<Path>{roots.workflows}/learning/G-goal/orchestration-protocol.md</Path>`
- Lead 编排：`<Path>{roots.workflows}/learning/G-goal/references/lead-orchestration.md</Path>`
- 挖掘单元：`<Path>{roots.workflows}/learning/G-goal/references/mine-unit.md</Path>`
- 拆课规则：`<Path>{roots.workflows}/learning/G-goal/references/split-rules.md</Path>`
- 覆盖尺：`<Path>{roots.workflows}/learning/G-goal/references/coverage-bar.md</Path>`
- 停止规则：`<Path>{roots.workflows}/learning/G-goal/references/stop-rules.md</Path>`
- 外部执行器：`<Path>{roots.workflows}/learning/G-goal/references/external-goal-runner.md</Path>`
