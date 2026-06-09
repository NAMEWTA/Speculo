# Persistence Contract SOP

`.status.json` schema、目录命名、frontmatter 最小集与写入责任的内化规范。
本文把 Speculo 持久化契约内化进本 skill，编写资产时**不读仓库 `docs/`**。

## 目录命名

| 类别 | 模式 | 例 |
|------|------|---|
| Change 目录 | `YYYY-MM-DD-<kebab-name>` | `2026-05-28-user-auth` |
| Command 产物目录 | `YYYY-MM-DD-<cmd-name>-<topic>` | `2026-05-28-debug-login-500` |
| 归档目录 | `archive/<cat>/<YYYY-MM>/<change-name>/` | `archive/dev/2026-05/2026-05-20-payment-flow/` |

`<cat>` 只能是 `dev`、`doc`、`ops`。

命令产生的持久化报告、快照、handoff 和一次性操作记录必须统一写入 `.speculo/commands/<YYYY-MM-DD>-<cmd-name>-<topic>/`。`temp/`、系统临时目录和项目根目录只允许作为不保留的执行中间位置，禁止作为 Speculo 持久化产物位置。

## `.status.json` 元字段（框架强制）

每个 change 的状态写在 `.speculo/<cat>/<change>/.status.json`：

```jsonc
{
  "name":           "string, change 目录名",
  "category":       "string, dev | doc | ops",
  "change_status":  "string, active | completed | archived",
  "execution_mode": "string, 由 workflow 自治声明的命名预设",
  "created_at":     "string, ISO 8601",
  "updated_at":     "string, ISO 8601",
  "current_phase":  "string, 当前 phase id",
  "phase_history": [
    {
      "phase":        "string, phase id",
      "entered_at":   "string, ISO 8601",
      "completed_at": "string|null, ISO 8601",
      "status":       "string, pending | in-progress | completed | skipped | revisited"
    }
  ]
}
```

workflow 自治字段在入口正文 `## 状态扩展字段` 声明，由执行者写入**同一份** `.status.json`，不另开文件。

## 顶层索引 schema（薄）

```jsonc
// .speculo/<cat>-status.json
{
  "active": [
    { "name": "string", "current_phase": "string", "updated_at": "string, ISO 8601" }
  ]
}
```

- 归档后变更**必须从 active 段移除**。
- 索引可重建：扫 `.speculo/<cat>/*/.status.json` 即可重建。
- 全局 `STATUS.json` **不物理存在**。

## Frontmatter 最小集

Frontmatter **仅承载发现元数据**（这是什么、叫什么、关于什么）。phases / 模板 / 依赖 / 调用 skill / 状态扩展字段 / 入口协议一律写进 Markdown 正文，用相对路径链接与小标题做渐进披露。

```yaml
# workflow
id: <category>/<name>   # 必填，全局唯一
category: dev|doc|ops   # 必填
name: <人类可读名>       # 必填
description: <一句话>    # 必填
keywords: [...]         # 可选

# command
id: <name>              # 必填，唯一
type: command           # 必填，固定值
name: <人类可读名>       # 必填
description: <一句话>    # 必填
keywords: [...]         # 可选

# skill
id: <name>              # 必填，唯一
type: skill             # 必填，固定值
name: <人类可读名>       # 必填
description: <一句话>    # 必填
```

## Template 不需要 Frontmatter

模板顶部用一段引用说明声明归属，占位符一律 `[TODO: ...]`：

```markdown
> **服务工作流：** `<相对路径>`
> **产物文件名：** `<filename>`

# <标题>

## <章节>
[TODO: 具体填写指引]
```

## 相对路径强约束

正文引用的 skill / template / 其它 workflow / phase 子文档**必须用相对路径**，禁止裸 id 或绝对路径。

## 写入责任

| 文件 | 用户可写 | AI 可写 |
|------|---------|---------|
| `.speculo/.config/RULES.md` | ✅ | ❌ |
| `.speculo/.config/LESSONS.md` | ⚠️ 可追加 | ✅ workflow 末尾追加 |
| `.speculo/.config/context/*` | ⚠️ 用户确认后 | ✅ 仅在用户确认后写入 |
| `.speculo/.config/adr/*` | ⚠️ 用户确认后 | ✅ 仅在用户确认后写入 |
| `.speculo/commands/<command-run>/*` | ⚠️ | ✅ command 按内联模板写入 |
| `.speculo/<cat>/<change>/*.md` | ⚠️ | ✅ |
| `.speculo/<cat>/<change>/.status.json` | ❌ | ✅ |
| `.speculo/*-status.json` | ❌ | ✅ |
| `.speculo/dev/docs-sync-state.json` | ❌ | ✅ `dev/D-docs-sync` 原子写入 |

**skill 不拥有独立持久化根目录**：skill 需要生成持久化文件时，必须使用调用方 command / workflow 声明的 `.speculo/...` 规范目标路径，或返回内容由调用方写入。禁止 skill 自行选择 `temp/`、系统临时目录、项目根目录或额外 state 文件作为持久化位置。

## 新分类骨架

新增 `<cat>` 分类时初始化：

- `.speculo/<cat>-status.json`（`{ "active": [] }`）
- `.speculo/<cat>/.gitkeep`
- `.speculo/archive/<cat>/.gitkeep`

项目级长期资料放 `.speculo/.config/`（`RULES.md`、`LESSONS.md`、`context/`、`adr/`），不要新增项目根 state 文件。
