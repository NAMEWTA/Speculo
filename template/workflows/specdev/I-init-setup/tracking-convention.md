# 变更追踪：本地 Markdown

specdev workflow 的变更以 markdown 目录形式存储在 `{roots.state}/specdev/changes/` 中。

## 约定

- 每个变更一个目录：`{roots.state}/specdev/changes/<YYYY-MM-DD>-<topic>/`
  - 例如：`changes/2026-07-21-add-auth-layer/`
- 当前活跃变更通过 `{roots.state}/specdev/status.json` 的 `active` 数组追踪，每个条目为包含 `change`、`current_work`、`works_run`、`result` 等字段的对象
- 归档变更移至：`{roots.state}/specdev/archive/YYYY-MM/<change>/`
  - 例如：`archive/2026-07/2026-07-21-add-auth-layer/`
- 变更目录内的工作产物由各 work 定义，典型结构：
  ```
  changes/<YYYY-MM-DD>-<topic>/
  ├── CONTEXT.md      ← 领域术语与概念（由 domain-modeling 或 G-grill-with-docs 创建/更新）
  ├── ADR.md          ← 架构决策记录（由 G-grill-with-docs 或 I-implement 创建/更新）
  ├── LOG.md          ← 设计决策日志（按时间顺序记录每次设计调整）
  ├── spec.md         ← 需求规格（由 S-spec 创建）
  ├── tickets/        ← 工作项（由 T-tickets 创建）
  │   └── NN-<slug>.md
  └── wayfinder/      ← 路线图（由 W-wayfinder 创建）
      └── map.md
  ```
- `status.json` 结构：
  ```jsonc
  {
    "schema_version": 2,
    "workflow": "specdev",
    "active": [
      {
        "change": "2026-07-21-add-auth-layer",
        "current_work": "specdev/grill-with-docs",
        "works_run": [],
        "result": null
      }
    ],
    "work_history": [],
    "completed": []
  }
  ```

## 当 work 说"发布到变更目录"时

在 `{roots.state}/specdev/changes/<change>/` 下创建或更新指定文件。如果变更目录尚未加入 `active` 数组，将其作为新条目（`{ change, current_work: null, works_run: [], result: null }`）追加到 `status.json` 的 `active` 中。

例如：`S-spec` 说"将规格发布到变更目录" → 写入 `<Path>{roots.state}/specdev/changes/<change>/spec.md</Path>`。

## 当 work 说"获取当前变更"时

读取 `<Path>{roots.state}/specdev/status.json</Path>` 的 `active` 数组，获取当前活跃变更列表。如果存在多个活跃变更，提示用户选择目标变更。如果无活跃变更，提示用户先运行 `S-spec` 或 `I-init-setup` 创建变更。

## 当 work 说"归档变更"时

将变更目录从 `{roots.state}/specdev/changes/<change>/` 移动到 `{roots.state}/specdev/archive/YYYY-MM/<change>/`（YYYY-MM 取变更日期中的年月），从 `status.json` 的 `active` 数组中移除对应条目，追加归档记录到 `completed` 数组。

## Wayfinding 操作

供 `W-wayfinder` 使用。**地图**是一个文件，每个工作项有一个**子**文件。

- **地图**：`{roots.state}/specdev/changes/<change>/wayfinder/map.md` —— Notes / Decisions-so-far / Fog 正文。
- **子工单**：`{roots.state}/specdev/changes/<change>/tickets/NN-<slug>.md`，从 `01` 开始编号，正文中包含问题。`Type:` 行记录工单类型（`research` / `prototype` / `grilling` / `task`）；`Status:` 行记录 `claimed` / `resolved`。
- **阻塞**：顶部附近的 `Blocked by: NN, NN` 行。当其列出的每个文件都处于 `resolved` 状态时，工单解除阻塞。
- **前沿**：扫描 `tickets/` 中处于开放、未阻塞且未认领状态的文件；按编号取第一个。
- **认领**：设置 `Status: claimed` 并在任何工作开始前保存。
- **解决**：在 `## Answer` 标题下追加答案，设置 `Status: resolved`，然后将上下文指针（gist + 链接）追加到 `map.md` 中地图的 Decisions-so-far 中。
