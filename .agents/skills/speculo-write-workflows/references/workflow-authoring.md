# Speculo Workflow Authoring Contract

## 格式分界

Workflow 包内所有文件均为纯自然 markdown，不使用 XML 块。

### INDEX.md — workflow 唯一入口

纯自然 markdown。包含：
- YAML frontmatter（`id`、`type: workflow`、`workflow`、`name`、`description`、`keywords`）
- 运行时根 — workflow/state 根路径说明
- 持久化约定 — status.json、changes/、archive/ 等
- 启动协议 — change 选择/创建步骤
- 状态字段 — status.json 字段说明
- 路径分配 — 产物写入规则
- 副作用边界 — 安全约束
- Work 条目 — `<!-- AUTO-INDEX-START -->`...`<!-- AUTO-INDEX-END -->` 标记的 work 列表

### Work 入口文件（`<Letter>-<work>/<Letter>-<work>.md`）

纯自然 markdown。仿 `<Path>{roots.vendor}/matt-pocock/productivity/writing-great-skills/SKILL.md</Path>` 的行文风格——编号步骤、内联完成标准、`<Path>` 指针引用子文件。无 XML 块。

## Package Structure

```text
workflows/<workflow>/
  INDEX.md               # 唯一入口——纯 markdown + AUTO-INDEX 标记
  <Letter>-<work>/       # work 条目（可多个），纯 markdown 入口
  _state/                # status.json, changes/, archive/（固定必需）
```

只有 workflow 存在真实 SKILL 依赖时才创建 `atomic-skills/`；不要为空 package 添加占位目录或 README。

## INDEX.md

INDEX.md 是 workflow 的唯一入口文件，纯自然 markdown，手动编写框架内容，work 列表通过脚本自动更新。

- 手动部分：frontmatter、运行时根、持久化约定、启动协议、状态字段、路径分配、副作用边界
- 自动部分：`<!-- AUTO-INDEX-START -->` 和 `<!-- AUTO-INDEX-END -->` 之间的 work 列表

每次新增、删除或重命名 work 后运行 `<Path>{roots.skills}/speculo-write-workflows/scripts/generate-index.mjs</Path>` 自动更新 work 列表，其余内容原样保留。

## Work 条目

- 命名：`<大写字母>-<work_name>/` 目录，入口文件与目录同名（如 `R-review/R-review.md`），便于 @ 触发
- 入口文件：frontmatter 包含 `id`、`type: workflow-entry`、`workflow`、`name`、`description`、`keywords`
- 入口格式：纯自然 markdown，步骤编号，完成标准内联，`<Path>` 指针引用子文件
- 渐进披露：入口只保留每条分支都需要的步骤；分支专属细节放在子文件中，以 `<Path>{roots.xxx}/...</Path>` 指针引用
- 路径引用：所有跨文件引用使用 `<Path>{roots.xxx}/...</Path>` 格式
- 持久化：work 产物写入 `_state/changes/<change>/`；不写入 `.speculo/` 全局目录

## _state/ 固定结构

- 固定必需：`status.json`、`changes/`、`archive/`
- 扩展自由：`.config/`、`LESSONS.md`、`RULES.md` 等由具体 workflow 自行决定
- `docs-sync.json` 是 command 拥有的延迟 sidecar，不得放入 `_state/`

## Validation Rules

- 无绝对路径、反斜杠、`..`、裸 id、`src` 或未声明 state namespace
- 所有静态引用使用 `<Path>{roots.xxx}/...</Path>` 格式并解析到真实文件
- `_state/` 必须包含 `status.json`、`changes/`、`archive/`
- Work 入口 frontmatter 的 `id` 与目录名一致；同一 workflow 下无重复主导词
- `docs-sync.json` 是 command 拥有的延迟 sidecar，不得放入 `_state/`
- INDEX.md frontmatter 的 `id`/`workflow` 与目录名一致
- 不再要求单独的 WORKFLOW.md 或 PERSISTENCE.md
- 所有文件均为纯自然 markdown，无 XML 块
