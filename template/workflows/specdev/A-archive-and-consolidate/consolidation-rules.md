# 知识沉淀规则

基于鉴别结果，向三个永久知识库执行写入操作。所有写入遵循 append/merge 语义——不盲写覆盖已有内容。

## adr/ 写入规则

### 序号分配

扫描 `<Path>{roots.state}/specdev/adr/</Path>` 下所有现有 ADR 文件，提取最大序号。新 ADR 取 N+1，四位零填充（`0001`、`0002`...）。

### 文件命名

`<NNNN>-<kebab-slug>.md`，其中 slug 从决策标题提取。例如：`0005-jwt-refresh-token-mechanism.md`。

### 内容格式

遵循 `<Path>{roots.workflows}/specdev/G-grill-with-docs/adr-format.md</Path>` 定义的格式：

```markdown
# ADR-NNNN: {标题}

- **日期**：{YYYY-MM-DD}
- **状态**：Accepted
- **决策上下文**：{为什么需要做这个决策}
- **决策内容**：{具体决策是什么}
- **后果**：{这个决策带来的影响，正面和负面}
```

### Supersede 处理

若新 ADR 取代旧 ADR，在旧 ADR 文件**开头**添加横幅：

```markdown
> **Superseded by [ADR-NNNN](./NNNN-<slug>.md)** — {简要说明取代原因}
```

**不删除旧 ADR**——历史决策链完整保留。

### 从 LOG 提升

若变更的 `LOG.md` 中存在 `LOG-XXXX: accepted` 条目，其结论满足 ADR 三条件（不可逆 + 令人意外 + 真实权衡）但未正式记录为 ADR，则：

1. 创建正式 ADR 文件
2. 在 Context 中注明"从 `<change-name>` 的 LOG-XXXX 提升"
3. 在原 LOG 条目添加 `Related: ADR-NNNN` 交叉引用

## context/ 写入规则

### 文件组织

`<Path>{roots.state}/specdev/context/</Path>` 下的术语可以组织在一个或多个 `.md` 文件中。若目录为空，创建首个术语文件（如 `domain-glossary.md`）。

### 条目格式

遵循 `<Path>{roots.workflows}/specdev/G-grill-with-docs/context-format.md</Path>` 定义的格式：

```markdown
**术语名**：一句话定义（1-2 句，精确、观点明确）。

_Avoid_: 别名1, 别名2（不应使用的同义词或旧称）
```

### 合并策略

| 场景 | 操作 |
|------|------|
| 新术语 | 追加条目到对应分组（如有） |
| 术语已存在，定义更新 | 替换定义文本；合并 `_Avoid_` 列表（取并集） |
| 术语更名 | 创建新条目；将旧名加入新条目的 `_Avoid_`；旧条目保留并标注 `> **注意**：此术语已更名为 **新术语名**` |
| 术语废弃 | 保留条目，标注 `> **已废弃**：{原因}，参见 **替代术语**` |

### 来源溯源

每个新增或更新的术语条目末尾添加来源标注：

```markdown
_来源：`<change-name>`（{YYYY-MM-DD}）_
```

## research/ 写入规则

### 文件组织

研究产物写入 `<Path>{roots.state}/specdev/research/<topic>.md</Path>`。维护 `<Path>{roots.state}/specdev/research/index.md</Path>` 索引表。

### index.md 格式

```markdown
# 研究索引

| 主题 | 来源变更 | 归档日期 | 摘要 |
|------|---------|---------|------|
| `<topic>` | `<change-name>` | {YYYY-MM-DD} | 一句话描述研究内容和结论 |
```

### 合并策略

| 场景 | 操作 |
|------|------|
| 新主题 | 复制研究文件到 `_state/research/`；追加条目到 `index.md` |
| 主题已存在，新发现补充 | 合并新发现到现有文件；更新 `index.md` 中的归档日期和摘要 |
| 主题已存在，新研究完全取代 | 在旧文件开头标注 `> **Superseded**：更新版本见本文后续内容`；追加新发现；更新 `index.md` |
| 纯变更特定 | 保留在归档变更的 `research/` 中，不提升 |

## 保护规则

- **不盲写覆盖**：所有写入使用 append/merge 语义；不会不经提示地覆盖已有内容
- **首次写入自动创建**：`adr/`、`context/` 目录首次写入时若不存在则自动创建
- **来源溯源**：所有合并内容标注来源变更名称和日期
- **禁止跨 workflow**：写入范围限定于 `<Path>{roots.state}/specdev/</Path>` 下的 adr/、context/、research/
- **格式规范**：写入内容遵循 G-grill-with-docs 定义的格式规范（`adr-format.md`、`context-format.md`）

## 完成标准

- 所有计划中的知识项已写入对应知识库
- 新建 ADR 编号连续且格式正确
- context/ 术语已合并且冲突已按用户裁决解决
- research/ 研究文件已添加且 `index.md` 已更新
- 被取代的旧条目已标注横幅
- 无未声明的路径被写入
