---
schema_version: 1
artifact: learning-goal-plan
change: YYYY-MM-DD-<kebab-topic>
topic: <topic-id>
project_path: <path-to-source-repo>
status: draft
modes: [plan]
orchestration: external-goal
coverage_domain: programming
expression_level: plain
coverage_depth: standard
wave_cap: 8
max_waves: 2
ready_for_execution: false
---

# Goal-Plan: <主题>

本文件由 G-goal 在 `plan` / `replan` 会话编译。计划正文里的「允许」不构成执行授权。`ready_for_execution: false`，直到用户把本计划交给外部 AI CLI `/goal`。

## 路径

- 本计划：`<Path>{roots.state}/learning/changes/{change}/goal/goal-plan.md</Path>`
- Chain：`<Path>{roots.state}/learning/changes/{change}/goal/chain.md</Path>`
- 覆盖矩阵：`<Path>{roots.state}/learning/changes/{change}/goal/coverage-matrix.md</Path>`
- 进度：`<Path>{roots.state}/learning/changes/{change}/goal/progress.md</Path>`
- 挖掘探针：`<Path>{roots.state}/learning/changes/{change}/goal/probes/</Path>`
- 验收：`<Path>{roots.state}/learning/changes/{change}/goal/verify.md</Path>`
- 旧计划：`<Path>{roots.state}/learning/changes/{change}/goal/revisions/</Path>`
- 课程地图（A 所有）：`<Path>{roots.state}/learning/changes/{change}/course.md</Path>`
- 讲义（L 所有）：`<Path>{roots.state}/learning/changes/{change}/lessons/</Path>`
- 问答课（Q 所有，`/goal` 不得写入）：`<Path>{roots.state}/learning/changes/{change}/inquiry/</Path>`

---

## §0 `/goal` 粘贴块

把下面整块复制到 AI CLI 后发送 `/goal`。不要改写 Outcome 或 HARD NO。

```text
/goal READ <Path>{roots.state}/learning/changes/{change}/goal/goal-plan.md</Path>

Outcome:
  范围内覆盖矩阵格子全部变为 covered | deferred(reason) | covered-by-parent；
  每个 chain 节点有一份 L 合同 Lesson；
  每节新课或改写课有对应 goal/probes/GP-*.md；
  写好 goal/verify.md。

Verification surface:
  goal/coverage-matrix.md 状态列；
  lessons/L-*.md 存在且满足 L-lesson 合同；
  goal/probes/GP-*.md 关闭态且至少改变过一个矩阵格子，或显式 defer；
  goal/verify.md 对照 stop-rules 逐条勾选。

Constraints:
  roots 只来自已打开的 workspace.json；
  只写当前 Change 的 lessons/ 与 goal/；
  派单跟随 L-lesson 与 socratic-questioning audience=mine；
  不发明库存里没有的函数。

Boundaries:
  不写 inquiry/、homework/、review/、synthesis/、archive/；
  不写 mastered；
  不复活 Q-quiz；
  不把 mine 写成学习者问答课；
  不自动激活 H/R/C/A-archive。

Iteration policy:
  同一时间只推进一个 chain 节点；
  先 L 写课，再 mine 探针，再更新矩阵与 progress；
  缺口可 re-dispatch-L 或 defer(reason)，不得用新问句代替矩阵变化。

Blocked-stop:
  本波矩阵无变化；达到 wave_cap 或 max_waves；用户暂停；
  缺源码 / 缺 baseline / 目标无法核对；所有权冲突或路径越界。
```

最小读取顺序见 §11。

---

## §1 Outcome and Authority

### Outcome

合格读者读完本 Goal 后，能用范围内源码与已写成的 Lesson 说明：系统 Context 与 Container、一条主路径与一条失败路径、范围内公开/领域函数的目的，以及公开 API / 枢纽方法的副作用与失败路径。完成证据是矩阵闭合 + Lesson + probe + `goal/verify.md`，不是「课写完」。

### Success and False Completion

算完成：stop-rules 的「完成即停」全部满足。

不算完成：

- 课写完
- 文件巡览结束
- 模型表示「已经理解」
- 主观百分比
- 只生成了 Goal-Plan 本身

### Non-goals

- 不自动激活 `H-homework`、`R-review`、`C-consolidate`、`A-archive`
- 不写 mastered
- 不复活 `Q-quiz`
- 不使用 `Q-question` 的 `inquiry/` Response 协议
- 不为琐碎 helper、生成代码、测试夹具单独开课

### Authoritative Inputs

| 优先级 | 输入 | 用途 |
| --- | --- | --- |
| 1 | 用户当场决定 | 覆盖范围、暂停、defer |
| 2 | `course.md` OBJ | 权威学习目标；本文件不改写 OBJ |
| 3 | `goal/coverage-matrix.md` | 格子状态是覆盖权威 |
| 4 | `goal/chain.md` | 课程序列投影 |
| 5 | 本计划派单菜谱 | `/goal` 只按 §5 / §7 行动 |
| 6 | 源码事实 | 库存与证据；不得发明符号 |

---

## §2 Scope

### In-scope

- 项目路径：
- 模块 / 公开 API：
- 必须覆盖的容器：

### Out-of-scope

-

### covered-by-parent / deferred

- 琐碎 helper、生成代码、测试夹具：`covered-by-parent` 或 `deferred(reason)`
- 「每一个函数」= 范围内公开/领域函数，不是仓库里每一个私有 one-liner
- 不改变任何覆盖格子的 Lesson 或 probe 不要写

### C4 库存快照

```text
[Context]
  <system> --uses--> <actor / external>

[Container]
  <container-a>
  <container-b>

[Happy path]
  <input> -> <transform> -> <store>

[Fail path]
  <input> -> <error>
```

范围内函数按模块归组，清单写在 `goal/coverage-matrix.md` 的 (a)(b) 表，不在本节约维护第二份过期名单。

---

## §3 Coverage Contract

v1 只实现编程四轴。默认档与证据规则以 `<Path>{roots.workflows}/learning/G-goal/references/coverage-bar.md</Path>` 为准。

| 轴 | 对象 | 默认 SOLO | 证据 |
| --- | --- | --- | --- |
| (a) 函数目的 | 范围内公开/领域函数 | Unistructural + explained | Lesson 函数表或父课 covered-by-parent |
| (b) 方法性状 | 公开 API 与枢纽内部方法 | Unistructural + explained | 副作用、失败路径、幂等、并发、纯/不纯 |
| (c) 业务架构 | 系统与容器 | Relational | C4 Context + Container + 关键 Component 的 ASCII |
| (d) 数据流 | 主路径与失败路径 | Relational | 源 → 变换 → 汇 + 存储点 + 所有权 |

Extended Abstract 不是完成条件。

---

## §4 Chain and Waves

权威序列在 `goal/chain.md`。本计划只记录波次与门。

| Wave | 焦点 | Lessons | 上限 | Gate |
| --- | --- | --- | --- | --- |
| 1 | C4 Context + Container + 主数据流 |  | ≤8 或 1 个容器 | G2/G3 |
| 2 | 范围内公开 API 与方法性状 |  | ≤8 或 1 个容器 | G2/G3 |

默认最多 `max_waves: 2`。同一时间只推进一个 chain 节点。Wave 不是并发授权。

---

## §5 Dispatch Recipe

`/goal` 的 `run` / `resume` 只读本节与 §7 / §8。计划会话不得执行本节。

对每个 ready 的 chain 节点，严格按这次序：

1. 跟随 `<Path>{roots.workflows}/learning/L-lesson/L-lesson.md</Path>` 与 `<Path>{roots.workflows}/learning/common/rules/teaching-policy.md</Path>`，写入 `lessons/L-<NNN>-<slug>.md`。
2. 跟随 `<Path>{roots.workflows}/learning/common/skills/socratic-questioning/SKILL.md</Path>` 且 `audience=mine`，按 `<Path>{roots.workflows}/learning/G-goal/probe-template.md</Path>` 写入 `goal/probes/GP-<NNN>-wave-<NN>.md`。审问对象是已写成的 Lesson 与源码，不是学习者。
3. 按探针缺口更新 `goal/coverage-matrix.md` 与 `goal/progress.md`。需要补丁时 `re-dispatch-L`；无法核对时 `defer(reason)`。

禁止：

- 跟随 `Q-question` 的 `inquiry/` Response 协议
- 自动激活 H / R / C / A-archive
- 把 mine 写成学习者问答课
- 在计划会话里写 `lessons/` 或 `goal/probes/`

---

## §6 Gates and DoD

停止规则以 `<Path>{roots.workflows}/learning/G-goal/references/stop-rules.md</Path>` 为准。

| Gate | 含义 | 证据 |
| --- | --- | --- |
| G0 | 计划已编译 | `goal/goal-plan.md`、`chain.md`、`coverage-matrix.md`、`progress.md` 存在；`course.md` 有可观察 OBJ |
| G2 | 本波至少改变一个矩阵格子 | 矩阵 diff + `progress.md` 一行事实 |
| G3 | 本波新课或改写课有对应 probe | `goal/probes/GP-*.md` |
| G-final | 范围内格子全部闭合且已验收 | 矩阵无 uncovered；`goal/verify.md` 已写 |

Overall Definition of Done = G-final。课写完不是 DoD。

---

## §7 Authorization Matrix

| 动作 | 计划会话（G-goal） | `/goal` 会话 |
| --- | --- | --- |
| 跟随 I-init-setup 写空骨架 | 允许 | 不授权 |
| 跟随 A 写或核对 course 地图 | 允许 | 不授权 |
| 写 goal-plan / chain / matrix / progress 骨架 | 允许 | 只更新 matrix / progress |
| 写 `lessons/` | 不授权 | 允许，且必须走 L 合同 |
| 写 `goal/probes/` | 不授权 | 允许，且必须 `audience=mine` |
| 写 `goal/verify.md` | 不授权 | 允许，在停止规则触发后 |
| 写 `inquiry/` / `homework/` / `review/` / `synthesis/` / `archive/` / mastered | 不授权 | 不授权 |

文档中的「允许」不构成 `/goal` 之外的额外授权。

---

## §8 Constraints / HARD NO

- 不复活 `Q-quiz`
- mine ≠ 学习者 Q/A；禁止 `inquiry/`、`Response:`、`Submission:`、`verdict`、mastered
- 不自动串联 H / R / C / A-archive
- 路径只用 `<Path>{roots.*}/...</Path>`；roots 必须来自已打开的 `workspace.json`
- 不发明库存里没有的函数、容器或数据流
- 不把 Wave 当成并发授权
- 不把 Extended Abstract 当成完成条件
- 不把计划会话里的「已批准 / 允许」当成执行授权

---

## §9 Resume Protocol

恢复时只读：

1. 本文件 §0、§5、§7、§8
2. `goal/progress.md` 当前行
3. 最近一份 `goal/probes/GP-*.md`
4. `goal/chain.md` 中状态为 `writing` / `written` / 下一个 `planned` 的节点

从最后一个改变了矩阵格子的检查点继续。仍覆盖有效格子的 Lesson 不删除、不重写。源码或范围变了先回到 G-goal `replan`，不要在 `/goal` 里偷偷扩 scope。

---

## §10 Progress

只记录可核对事实，权威表在 `goal/progress.md`。不准写主观百分比。

---

## §11 Minimum read order for `/goal`

1. 已打开的 `<Path>{roots.state}/workspace.json</Path>`
2. 本计划 §0、§5、§7、§8
3. `goal/chain.md` 当前节点
4. `<Path>{roots.workflows}/learning/L-lesson/L-lesson.md</Path>` 与 teaching-policy
5. 写完 Lesson 后：`probe-template.md` + socratic-questioning 且 `audience=mine`
6. `goal/coverage-matrix.md` + `<Path>{roots.workflows}/learning/G-goal/references/stop-rules.md</Path>`
7. 停止规则触发后写 `goal/verify.md`

不要整读 archive、其他 Change，或 `inquiry/`。
