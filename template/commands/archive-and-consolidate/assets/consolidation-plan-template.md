# Consolidation Plan

> 生成时间：<YYYY-MM-DD HH:MM>
> Workflow：<workflow-name>
> 扫描 change 数：<N>
> 知识产物数：<N>
> 目标 stores：<INDEX.md 声明的知识 store 列表>

## 提取摘要

| 目标 Store | 新建 | 合并 | 冲突(需确认) | 跳过(Ephemeral) |
|------------|------|------|-------------|----------------|
| adr/ | <N> | <N> | <N> | <N> |
| context/ | <N> | <N> | <N> | <N> |
| <其他已声明 store> | <N> | <N> | <N> | <N> |

---

## adr/

### [NEW] <NNNN>-<slug>.md
- **来源 change**：<change-name>
- **决策标题**：<title>
- **毕业判定**：<stable-mechanism / repeated-lesson / must-know>
- **内容摘要**：<1-2 句总结>
- **Supersedes**：<如有，列出被取代的 ADR 编号>

### [SUPERSEDE] <NNNN>-<slug>.md
- **被取代原因**：<新 ADR 编号和简要理由>

---

## context/

### [ADD] 术语 "<term>"
- **来源 change**：<change-name>
- **定义**：<definition>
- **_Avoid_（避免使用）**：<synonyms>
- **毕业判定**：<stable-mechanism / must-know>
- **目标文件**：<context/ 下的目标文件路径>

### [CONFLICT] 术语 "<term>"
- **现有定义**：<existing definition>
- **新定义**：<new definition from change>
- **建议**：<resolution suggestion>

---

## <其他已声明 store>

### [ADD] <条目标题>
- **来源 change**：<change-name>
- **内容摘要**：<summary>
- **毕业判定**：<criterion>

### [CONFLICT] <冲突描述>
- **现有内容**：<existing>
- **新内容**：<new>
- **建议**：<resolution suggestion>

---

## Ephemeral（不提取，留在归档 change 中）

| Change | 知识项 | 跳过原因 |
|--------|--------|---------|
| <change> | <item> | <未通过毕业标准/触发反毕业标准> |
