# Persistence Contract SOP

`.status.json` schema、目录命名、frontmatter 最小集与写入责任的内化规范。
本文把 Speculo 持久化契约内化进本 skill，编写资产时**不读仓库 `docs/`**。

> # ⚠️ 持久化铁律
>
> **Speculo 框架的所有运行时产物，必须且只能存放在 `speculo/.speculo/` 目录中。**
>
> - Workflow 产物 → `speculo/.speculo/<cat>/<change>/`
> - Command 产物 → `speculo/.speculo/commands/<YYYY-MM-DD>-<cmd>-<topic>/`
> - Skill **不自行持久化** → 由调用方写入 `speculo/.speculo/...` 或返回内容
> - **绝对禁止** → `temp/`、系统临时目录、项目根目录的裸 `.speculo/`

## 命名铁律

> ⚠️ **所有 change 目录、command 产物目录、归档路径必须以 `YYYY-MM-DD-` 开头。无一例外。**

不带日期的目录名是**无效的**。

### 谁必须带日期

| 必须带 | 规则 | 谁创建 |
|--------|------|--------|
| Change 目录 | `YYYY-MM-DD-<kebab-name>` | Workflow（AI 按用户意图创建） |
| Command 产物目录 | `YYYY-MM-DD-<cmd-name>-<topic>` | Command（AI 执行命令时创建） |
| 归档目标目录 | `archive/<cat>/<YYYY-MM>/<change-name>/` | `archive` 命令或 `dev/04` 工作流 |

### 谁不需要带日期

| 不需要带 | 原因 |
|----------|------|
| Workflow 阶段目录（如 `01-grill-with-docs/`） | 框架资产，非运行时产物 |
| Skill 目录（如 `caveman/`） | 框架资产，非运行时产物 |
| Command 文件（如 `archive.md`） | 框架资产，非运行时产物 |
| 模板文件（`_templates/`） | 框架资产，非运行时产物 |
| `.config/`、`adr/`、`context/` | 项目配置目录，非产物目录 |

### 反例

| ❌ 错误 | ✅ 正确 |
|---------|---------|
| `user-auth` | `2026-06-12-user-auth` |
| `fix-bug` | `2026-06-12-fix-login-bug` |
| `prd-draft` | `2026-06-12-prd-user-flow` |
| `status-snapshot/` | `2026-06-12-status-snapshot/` |

### AI 代理执行规则

1. **创建 change 目录时**：必须从当前日期生成 `YYYY-MM-DD-<kebab-name>`，`<kebab-name>` 从用户意图提取。
2. **创建 command 产物目录时**：必须从当前日期生成 `YYYY-MM-DD-<cmd-name>-<topic>`。
3. **扫描已有 change 时**：不符合 `YYYY-MM-DD-<kebab-name>` 的目录视为 `malformed`，必须汇报用户。
4. **归档时**：目标路径必须包含 `archive/<cat>/<YYYY-MM>/`，`<YYYY-MM>` 从 change 目录名中的日期提取。

## 目录命名

| 类别 | 模式 | 例 |
|------|------|---|
| Change 目录 | `YYYY-MM-DD-<kebab-name>` | `2026-05-28-user-auth` |
| Command 产物目录 | `YYYY-MM-DD-<cmd-name>-<topic>` | `2026-05-28-debug-login-500` |
| 归档目录 | `archive/<cat>/<YYYY-MM>/<change-name>/` | `archive/dev/2026-05/2026-05-20-payment-flow/` |

`<cat>` 只能是 `dev`、`doc`、`person`。`ops` 是预留分类，只有骨架和 workflow 分类同时落地后才能加入枚举。

命令产生的持久化报告、快照、handoff 和一次性操作记录必须统一写入 `speculo/.speculo/commands/<YYYY-MM-DD>-<cmd-name>-<topic>/`。`temp/`、系统临时目录和项目根目录只允许作为不保留的执行中间位置，禁止作为 Speculo 持久化产物位置。

## Change 初始化铁律

> ⚠️ **每个 change 目录创建时必须同时完成以下三项写入，缺一不可。未完成初始化的 change 视为 `broken-change`，`status` 与 `archive` 命令将报告并跳过。**

### 初始化顺序

按以下顺序原子执行，前一步失败时停止后续并报告：

1. **创建 change 目录** —— `speculo/.speculo/<cat>/<YYYY-MM-DD>-<kebab-name>/`。
2. **写入 `.status.json`** —— 在 change 目录下创建 `.status.json`，填入最小必填字段。
3. **更新 `<cat>-status.json`** —— 在 `speculo/.speculo/<cat>-status.json` 的 `active[]` 中追加该 change 的索引条目。

### `.status.json` 最小初始化模板

```jsonc
{
  "name": "<YYYY-MM-DD>-<kebab-name>",
  "category": "dev | doc | person",
  "change_status": "active",
  "execution_mode": "待 workflow 首次进入时填写",
  "created_at": "<ISO 8601，当前时间>",
  "updated_at": "<ISO 8601，与 created_at 相同>",
  "current_phase": "00-init",
  "phase_history": [
    {
      "phase": "00-init",
      "entered_at": "<ISO 8601>",
      "completed_at": "<ISO 8601>",
      "status": "completed"
    }
  ]
}
```

### `<cat>-status.json` 追加条目模板

```jsonc
{
  "name": "<YYYY-MM-DD>-<kebab-name>",
  "current_phase": "00-init",
  "updated_at": "<ISO 8601>"
}
```

`active[]` 支持同分类多 change 并发。创建 change 时必须逐项确认目录名、`.status.json`、索引条目和时间戳均已写入。

## `.status.json` 元字段（框架强制）

每个 change 的状态写在 `speculo/.speculo/<cat>/<change>/.status.json`：

```jsonc
{
  "name":           "string, change 目录名",
  "category":       "string, dev | doc | person",
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
      "status":       "string, pending | in-progress | completed | skipped | revisited | blocked"
    }
  ]
}
```

workflow 自治字段在入口正文 `## 状态扩展字段` 声明，由执行者写入**同一份** `.status.json`，不另开文件。`current_phase` 必须使用 workflow 入口声明的稳定机器 id（kebab-case），不是人类可读标题。首个 workflow 进入 change 时必须写入 `execution_mode`。

`change_status: completed` 只允许负责最终交付边界的收尾 workflow（当前为 `dev/04-finalize`）写入；`change_status: archived` 只允许 `archive` 命令或收尾 workflow 的归档步骤写入。其他 workflow 只能维护自己的扩展字段。

## 顶层索引 schema（薄）

```jsonc
// speculo/.speculo/<cat>-status.json
{
  "active": [
    { "name": "string", "current_phase": "string", "updated_at": "string, ISO 8601" }
  ]
}
```

- Change 创建时**必须**在 `active[]` 追加索引条目。
- 归档后变更**必须从 active 段移除**。
- 索引可重建：扫 `speculo/.speculo/<cat>/*/.status.json` 即可重建。
- 全局 `STATUS.json` **不物理存在**。

## Frontmatter 最小集

Frontmatter **仅承载发现元数据**（这是什么、叫什么、关于什么）。phases / 模板 / 依赖 / 调用 skill / 状态扩展字段 / 入口协议一律写进 Markdown 正文，用相对路径链接与小标题做渐进披露。

```yaml
# workflow
id: <category>/<name>   # 必填，全局唯一
category: dev|doc|person       # 必填；ops 为预留分类，未在模板骨架落地
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
| `speculo/.speculo/.config/RULES.md` | ✅ | ❌ |
| `speculo/.speculo/.config/LESSONS.md` | ⚠️ 可追加 | ✅ workflow 末尾追加 |
| `speculo/.speculo/.config/context/*` | ⚠️ 用户确认后 | ✅ 仅在用户确认后写入 |
| `speculo/.speculo/.config/adr/*` | ⚠️ 用户确认后 | ✅ 仅在用户确认后写入 |
| `speculo/.speculo/commands/<command-run>/*` | ⚠️ | ✅ command 按内联模板写入 |
| `speculo/.speculo/<cat>/<change>/*.md` | ⚠️ | ✅ |
| `speculo/.speculo/<cat>/<change>/.status.json` | ❌ | ✅ |
| `speculo/.speculo/*-status.json` | ❌ | ✅ |
| `speculo/.speculo/dev/docs-sync-state.json` | ❌ | ✅ `dev/D-docs-sync` 原子写入；保存 tracked assets 与 git diff 基线 |

**skill 不拥有独立持久化根目录**：skill 需要生成持久化文件时，必须使用调用方 command / workflow 声明的 `speculo/.speculo/...` 规范目标路径，或返回内容由调用方写入。禁止 skill 自行选择 `temp/`、系统临时目录、项目根目录或额外 state 文件作为持久化位置。

## 新分类骨架

新增 `<cat>` 分类时初始化：

- `speculo/.speculo/<cat>-status.json`（`{ "active": [] }`）
- `speculo/.speculo/<cat>/.gitkeep`
- `speculo/.speculo/archive/<cat>/.gitkeep`

项目级长期资料放 `speculo/.speculo/.config/`（`RULES.md`、`LESSONS.md`、`context/`、`adr/`），不要新增项目根 state 文件。

## Workflow Agents

当 workflow 的 phase 适合隔离执行、并行审查或反自证验证时，可在该 workflow 目录下创建：

```text
template/workflows/<cat>/<entry>/agents/<name>-agent.md
```

Agent 文件是框架资产，不是运行时产物；frontmatter 最小集为：

```yaml
---
id: <cat>/<entry>/<agent-name>
type: agent
name: <人类可读名>
description: <一句话说明该 agent 何时用于隔离执行>
---
```

正文必须包含：

- `## 使命`：单一 phase 或审查轴。
- `## 输入契约`：当前 change 路径、`current_phase`/`phase-id`、上游产物。
- `## 执行规范`：用相对路径引用同目录 phase 文件、模板、skill；不得复制大段规范正文。
- `## 产物与状态`：产物路径和 `.status.json` 扩展字段写入责任。
- `## 边界`：不越过本 phase、不改无关文件、不写 `change_status`。

Workflow 入口若提供 agents，必须在 `## 阶段` 中列出对应 agent 相对路径。Agent 只可写它声明的 phase 产物和状态扩展字段；最终 `change_status` 仍由收尾 workflow 或 `archive` 命令负责。

## 命名校验清单

### 创建时

- [ ] change 目录名匹配 `^\d{4}-\d{2}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$`
- [ ] command 产物目录名匹配 `^\d{4}-\d{2}-\d{2}-[a-z0-9]+-[a-z0-9]+(-[a-z0-9]+)*$`
- [ ] 日期部分使用**当前日期**（`YYYY-MM-DD`）
- [ ] `<kebab-name>` 从用户意图中提取
- [ ] `.status.json` 已写入且包含全部最小必填字段
- [ ] `<cat>-status.json` 的 `active[]` 已追加索引条目

### 扫描时

- [ ] 仅处理符合日期命名规范的目录
- [ ] 不符合规范的目录标记为 `malformed`，必须汇报
- [ ] 不自动删除、重命名或忽略 malformed 目录
