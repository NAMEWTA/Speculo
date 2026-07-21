# Consolidation Rules

从已完成 change 的知识产物中提取、分类并合并到 workflow `_state/` 声明的持久化 store。

## 提取来源

对每个候选 change，扫描以下知识产物：

1. `completion-summary.md` — 交付边界、关键变更、遗留事项
2. `completion-verification.md` — 验证证据、需求核对、调试残留
3. Change 自身的 ADR.md — 架构决策记录
4. LOG.md — 设计决策日志（可能含未正式记录的 ADR）
5. CONTEXT.md — 领域术语定义
6. 任何自定义知识产物

## Store 映射与合并策略

### adr/（架构决策记录目录）

- **提取条件**：满足三项 ADR 特征（不可逆 + 令人意外 + 真实权衡）。
- **序号分配**：扫描现有 `adr/` 中最大序号，新 ADR 取 N+1，四位零填充（`0001`、`0002`...）。
- **文件命名**：`<NNNN>-<kebab-slug>.md`。
- **内容格式**：标题、状态（Accepted）、日期、决策上下文、决策内容、后果。
- **Supersede 处理**：若新 ADR 取代旧 ADR，在旧 ADR 开头添加 `> **Superseded by [ADR-NNNN](./NNNN-<slug>.md)**`；不删除旧 ADR。
- **从 LOG 提升**：LOG.md 中满足 ADR 标准但未正式记录的决策 → 创建正式 ADR，注明"从 LOG.md 提升"。

### context/（领域词汇表目录）

- **提取条件**：项目特有的领域术语，不是通用编程概念。
- **合并方式**：将新术语合并到 `context/` 目录下的现有术语文件中。若目录为空，创建首个术语文件。
- **条目格式**：遵循 `**术语名**：定义` + `_Avoid_: 同义词` 格式。
- **冲突检测**：若术语已在 context/ 中存在定义，比较两者：
  - 一致 → 跳过（记录"已存在"）
  - 不同 → 标记 `needs-confirmation`，展示两个版本
- **保留现有**：已有的 `_Avoid_` 标注和术语分组不覆盖。
- **术语更名**：若新术语取代旧术语，在旧术语的 `_Avoid_` 中保留旧名称，创建新术语条目。

### 其他知识 store（若 INDEX.md 声明）

若 `INDEX.md` 持久化约定表声明了 `adr/` 和 `context/` 以外的知识 store：

- **提取条件**：按知识类型匹配最合适的 store。
- **合并方式**：默认使用 append 语义；目录型 store 创建新文件，文件型 store 追加条目。
- **冲突处理**：与已有内容矛盾 → 标记 `needs-confirmation`。
- **未声明则跳过**：不向 INDEX.md 未声明的路径写入。

## 保护规则

- **永不盲覆盖**：所有写入使用 append/merge 语义；不会不经提示地覆盖已有内容。
- **目录 store（adr/、context/）**：首次写入时若目录不存在则自动创建。
- **不创建未声明 store**：只写入 INDEX.md 持久化约定表中声明的 store。
- **来源溯源**：所有合并内容标注来源 change 名称和日期。
- **禁止跨 workflow**：合并范围限定于当前 workflow 声明的 stores。

## Store 创建策略

默认行为（无显式声明时）：

| store | 行为 |
|-------|------|
| `adr/` | 首次写入时自动创建目录 |
| `context/` | 首次写入时自动创建目录 |
| 其他已声明 store | 若不存在则跳过并警告；不自动创建 |

## 完成标准

- 每个 change 的知识产物都已扫描和分类。
- 每个提取候选项已评定毕业状态和目标 store。
- 冲突项已标记 `needs-confirmation` 并提供双方版本。
- 合并计划中每项都有来源 change、目标 store、动作（create/merge/append）和判定理由。
