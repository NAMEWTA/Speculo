# 变更追踪：本地 Markdown

specdev workflow 的变更以 markdown 目录形式存储在 `{roots.state}/specdev/changes/` 中。

## 约定

- 每个变更一个目录：`{roots.state}/specdev/changes/<YYYY-MM-DD>-<topic>/`
  - 例如：`changes/2026-07-21-add-auth-layer/`
- 当前活跃变更通过 `{roots.state}/specdev/status.json` 的 `active` 数组追踪，每个条目为包含 `change`、`current_work`、`works_run`、`result` 等字段的对象——完整字段定义见 `<Path>{roots.workflows}/specdev/INDEX.md</Path>` 的「状态字段」一节，此处不重复
- 归档变更移至：`{roots.state}/specdev/archive/YYYY-MM/<change>/`
  - 例如：`archive/2026-07/2026-07-21-add-auth-layer/`
- 变更目录内的工作产物由各 work 定义，典型结构：
  ```
  changes/<YYYY-MM-DD>-<topic>/
  ├── .status.json    ← 本 change 的个体状态（见 INDEX.md「Per-change 状态文件」）
  ├── CONTEXT.md      ← 领域词汇表（G-grill-with-docs 创建/更新）
  ├── ADR.md          ← 架构决策记录（G-grill-with-docs 创建/更新）
  ├── LOG.md          ← 设计决策日志（各 work 追加结论）
  ├── spec.md         ← 需求规格（S-spec 创建）
  ├── tickets-map.md  ← ticket 总体地图与执行清单（T-tickets 创建）
  ├── ticket/         ← 独立 ticket 文件（T-tickets 创建）
  │   └── NN-<name>.md
  ├── map.md          ← 寻路地图（W-wayfinder 创建）
  ├── goal-plan.md    ← 目标规划文档（P-goal-plan 创建）
  ├── research/       ← 研究产物（common/research 维护，含 index.md）
  └── prototype/      ← 原型产物（common/prototype 维护，含 index.md）
  ```

## 当 work 说"发布到变更目录"时

在 `{roots.state}/specdev/changes/<change>/` 下创建或更新指定文件。如果变更目录尚未加入 `active` 数组，将其作为新条目（`{ change, current_work: null, works_run: [], result: null }`）追加到 `status.json` 的 `active` 中。

例如：`S-spec` 说"将规格发布到变更目录" → 写入 `<Path>{roots.state}/specdev/changes/<change>/spec.md</Path>`。

## 当 work 说"获取当前变更"时

按 `<Path>{roots.workflows}/specdev/INDEX.md</Path>` 启动协议执行：读取 `status.json` 的 `active` 数组——用户指定则匹配对应条目；唯一活跃则直接使用；无活跃则创建新变更目录并追加条目；多个候选则由用户消歧。

## 当 work 说"归档变更"时

将变更目录从 `{roots.state}/specdev/changes/<change>/` 移动到 `{roots.state}/specdev/archive/YYYY-MM/<change>/`（YYYY-MM 取变更日期中的年月），从 `status.json` 的 `active` 数组中移除对应条目，追加归档记录到 `completed` 数组。完整归档与知识沉淀规程见 `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/A-archive-and-consolidate.md</Path>`。

## Wayfinding 操作

供 `W-wayfinder` 使用。**地图是单个文件** `{roots.state}/specdev/changes/<change>/map.md`，tickets 是地图文件内的编号小节，不是独立文件：

- **状态**：checkbox 标记——`- [ ]` 开放、`- [x]` 已解决
- **阻塞**：ticket 小节内的「被阻塞于」字段，以 ticket 标题引用
- **领取**：将 ticket 名称追加到 `status.json` 当前 change 条目的 `claimed_tickets` 数组，完成后移除
- **前沿**：开放、未被阻塞、未被领取的 tickets

完整地图结构与遍历规程见 `<Path>{roots.workflows}/specdev/W-wayfinder/W-wayfinder.md</Path>`。
