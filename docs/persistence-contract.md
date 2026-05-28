# Speculo 持久化契约（机器可读规范）

所有 `.status.json` schema、目录命名规则、frontmatter 必填字段集合**唯一权威**文档。AI / 工具集成者 / 自动化脚本以本文档为准。

---

## 1. 目录命名

| 类别 | 模式 | 例 |
|------|------|---|
| Change 目录 | `YYYY-MM-DD-<kebab-name>` | `2026-05-28-user-auth` |
| Command 产物目录 | `YYYY-MM-DD-<cmd-name>-<topic>` | `2026-05-28-debug-login-500` |
| 归档目录 | `archive/<cat>/<YYYY-MM>/<change-name>/` | `archive/dev/2026-05/2026-05-20-payment-flow/` |

## 2. `.status.json` 元字段（框架强制）

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

## 3. 顶层索引 schema（薄）

```jsonc
// .speculo/<cat>-status.json
{
  "active": [
    {
      "name":          "string, change 目录名",
      "current_phase": "string",
      "updated_at":    "string, ISO 8601"
    }
  ]
}
```

- 归档后变更**必须从 active 段移除**
- 索引可重建：扫 `.speculo/<cat>/*/.status.json` 重建即可
- 全局 `STATUS.json` **不物理存在**

## 4. Frontmatter 极简原则

Frontmatter **仅承载发现元数据**——让 AI 和 adapter 能扫描出"这是什么、叫什么、关于什么"。

所有结构化引用（phases / 模板 / 依赖 workflow / 调用 skill / 状态扩展字段 / 入口协议）一律放在 **Markdown 正文**里，通过相对路径链接和小标题做物理渐进披露。

## 5. Workflow Frontmatter（最小集）

```yaml
---
id: <category>/<name>        # 必填：全局唯一
category: dev | doc | ops    # 必填
name: <人类可读名>            # 必填
description: <一句话>         # 必填
keywords: [...]              # 可选：adapter 触发匹配
---
```

正文必须包含以下章节（推荐顺序）：

| 章节 | 内容 |
|------|------|
| `## 阶段` | 按顺序列出每个 phase：规范文件（相对路径）、模板文件（相对路径）、产物文件名、完成准则 |
| `## 依赖` | 列出软依赖 / 硬依赖的其他 workflow（相对路径） |
| `## 状态扩展字段` | 本 workflow 要追加到 `.status.json` 的字段及类型 |
| `## 完成与状态更新` | 每个 phase 完成时的状态写入动作 |

### 依赖关系语义

- **软依赖**：建议先做，不强制；`00-INDEX.md` 推荐时仅作排序提示
- **硬依赖**：未满足时拒绝执行；`00-INDEX.md` 必须报错并提示先跑前置

### `scope` 枚举（在正文中描述）
- `same-change`：限同一 change 目录下
- `project-wide`：项目级任意位置存在即可
- `none`：仅推荐顺序

## 6. Command Frontmatter（最小集）

```yaml
---
id: <name>                   # 必填：唯一
type: command                # 必填：固定值
name: <人类可读名>            # 必填
description: <一句话>         # 必填
keywords: [...]              # 可选
---
```

正文必须包含：归档路径模式、调用的 skills（相对路径）、执行步骤、内联产物模板。

## 7. Skill Frontmatter（最小集）

```yaml
---
id: <name>                   # 必填：唯一
type: skill                  # 必填：固定值
name: <人类可读名>            # 必填
description: <一句话>         # 必填
---
```

正文必须包含：输入契约、输出契约、`references/` 子文档何时读、`scripts/` 何时调。

## 8. Template 不需要 Frontmatter

模板顶部用一段引用说明声明归属：

```markdown
> **服务工作流：** `<相对路径>`
> **产物文件名：** `<filename>`

# <标题>

## <章节>
[TODO: 具体填写指引]
```

## 9. 相对路径强约束

正文中引用的 skill / template / 其他 workflow / phase 子文档**必须用相对路径**，禁止使用裸 id 或绝对路径。

## 9. 写入责任

| 文件 | 用户可写 | AI 可写 |
|------|---------|---------|
| `.speculo/.config/*.md` | ✅ | ⚠️ 需用户审批 |
| `.speculo/.config/RULES.md` | ✅ | ❌ 严禁自动改 |
| `.speculo/<cat>/<change>/*.md` | ⚠️ | ✅ |
| `.speculo/<cat>/<change>/.status.json` | ❌ | ✅ |
| `.speculo/*-status.json` | ❌ | ✅ |
| `.speculo/.config/LESSONS.md` | ⚠️ 可追加 | ✅ workflow 末尾追加 |
