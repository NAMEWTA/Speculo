# Change 工件布局

普通学习 Change 至少包含：

```text
changes/<change-id>/
  INDEX.md
  course.md
  background/foundation.md
  baseline.md
  sources.md
  lessons/INDEX.md
  lessons/L-001-<slug>.md
  homework/INDEX.md
  homework/HW-001-<slug>-attempt-01.md
  inquiry/INDEX.md
  inquiry/IQ-001-<slug>-batch-01.md
  goal/goal-plan.md
  goal/chain.md
  goal/coverage-matrix.md
  goal/progress.md
  goal/probes/
  notes/
  learning-log.md
  .status.json
```

`inquiry/` 由 `Q-question` 拥有；`goal/` 由 `G-goal` 拥有。计划会话只写 Goal-Plan 骨架（`goal-plan.md` / `chain.md` / `coverage-matrix.md` / `progress.md` 与 mine unit 切分），不写 `goal/probes/` 或 `lessons/` 正文。`/goal` Lead 可更新矩阵与 progress 并写入 probes/verify；L 子代理只写被分配的 Lesson；miner 只写自己的 `GP-*-b0N`；不得写入 `inquiry/`。

综合父 Change 使用：

```text
changes/<topic>-consolidation/
  INDEX.md
  .status.json
  children/<child-id>/                 # C 确认后物理搬入，内容字节不改写
  synthesis/INDEX.md
  synthesis/source-manifest.json
  synthesis/overview.md
  synthesis/claim-matrix.md
  synthesis/concept-map.md
  synthesis/conflicts-and-gaps.md
  synthesis/revisions/<version>.md
```

子 Change 的 Lesson、Homework 和后续 Markdown 仍写入 `children/<child-id>/`；父 Change 负责根级锁、位置登记和路由，子 Change 仍是这些工件的 owner。综合输出是可重建的派生视图，不覆盖原始课程、答案或评审。
