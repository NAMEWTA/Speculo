# Cleanup Rules

知识合并完成后，审计 workflow 已声明的知识 stores，生成清理候选清单。默认只分析，不自行修改文件。

## 扫描范围

1. 读取目标 workflow `INDEX.md` 的持久化约定表，提取所有知识型 store（名称含"永久"或位于 `adr/`、`context/` 等公认目录下）且真实存在的。
2. 尚未创建的 lazy store 记为 `missing`，不为清理而创建。
3. 扫描当前代码、文档、active changes 和 archive 中对 ADR、context 条目及具体文件名的引用。
4. 额外扫描：归档目录中可能指向知识文件的孤立引用。

## 候选生成

### 可删除（delete）

- 已被标记 `Superseded` 超过 30 天且无 active change 引用的 ADR。
- 只含占位符、模板说明、标题但无实质内容的知识文件（保留超过 60 天）。
- 已退役符号/概念在所有 consumer、rules、skills、memory 中无引用的条目。
- 已完成待办仍列为开放项（核实后删除，不保留流水账）。
- 多个位置复制的同一规则（保留权威真身，其余删除或替换为指针）。

### 可合并（merge）

- `adr/` 中多条内容相似的 ADR（合并为一条，注明多个来源）。
- `context/` 中同一概念在多处有不同表述但实质相同（指定权威版本，其余加指针）。
- 被新 ADR 或规则完全吸收的旧 lesson（合并到对应 ADR 引用）。

### 可改写（rewrite）

- 内容正确但格式不符合 store 规范的条目。
- 含有相对时间表述（"recently"、"两个月前"）的条目 → 改为绝对日期。
- "保留作历史"但无真实读者和用途的条目 → 精简为指针或删除。

### 需确认（needs-confirmation）

- 规则修改或删除（若 INDEX.md 声明了规则相关 store）。
- 术语定义冲突（`context/` 中同一术语有不同定义）。
- ADR/context 内容的实质性改写。
- 非标准知识 store 的任何修改建议。
- 矛盾规则无法自动裁决。

### 保留（keep）

- 仍被代码、文档、archive 或 active change 引用的内容。
- 距创建不足 30 天的 ADR（即使已被 supersede）。
- 单次出现但满足毕业标准的知识（可能是新领域，引用尚未积累）。

## 保护规则

- 删除前解析真实路径，确认仍位于目标 workflow state root 和已声明 store 内。
- 不跨 workflow 合并知识。
- 不修改 `docs-sync` state（`docs-sync.json` 由 docs-sync command 专有）。
- 知识目录的 `.gitkeep` 处理：目录有其他内容时移除；空目录保留 `.gitkeep`。

## 反模式清理

扫描并标记以下反模式（继承自 neat-freak sync-matrix）：

| 反模式 | 处理 |
|--------|------|
| 主规则顶部"某日 X 上线"历史叙事 | 纯历史迁 git/changelog；现役约束就地融合 |
| 主规则抄完整架构/公式 | 留边界和权威文档指针，详细机制回 docs |
| 多个版本都自称"现役" | 以代码现状裁决；历史版显式标退役 |
| 已完成待办仍列开放项 | 核实后删除或改为当前约束 |
| 单次事故长篇常驻 | 提炼可复用教训；机制进 docs，过程进 incident/git |
| 会话残留（一次性计划、调试脚本、`_old`/`_backup` 副本） | 有效内容并进正式文档；文件列删除候选 |

## 完成标准

- 所有 INDEX.md 声明且存在的知识 store 均已扫描。
- 每个候选属于恰好一个分类（`delete | merge | rewrite | keep | needs-confirmation`）。
- 每个候选有来源路径、证据和风险说明。
- 未确认时文件系统未发生变化。
