# Consolidation Plan

> 生成时间：<YYYY-MM-DD HH:MM>
> Workflow：<workflow-name>
> 扫描 change 数：<N>
> 知识产物数：<N>
> 目标 stores：<领域 Skill/manifest 声明的知识 store 列表>

## 提取摘要

| 目标 Store | 新建 | 合并 | 冲突(需确认) | 跳过(Ephemeral) |
|------------|------|------|-------------|----------------|
| adr/ | <N> | <N> | <N> | <N> |
| context/ | <N> | <N> | <N> | <N> |
| <其他已声明 store> | <N> | <N> | <N> | <N> |

---

## adr/

### [NEW] <YYYY-MM-DD>-<topic>[-NN].md
- **来源 change**：<change-name>
- **决策标题**：<title>
- **毕业判定**：<stable-mechanism / repeated-lesson / must-know>
- **内容摘要**：<1-2 句总结>
- **Supersedes**：<如有，列出被取代的 ADR 稳定名称及完整/部分范围>

### [SUPERSEDE] <YYYY-MM-DD>-<topic>[-NN].md
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

## SpecDev DESIGN（存在设计提升时）

- 批准来源与时间：<原用户确认 locator / ISO 时间>
- 计划摘要：<sha256>
- 当前 revision / 字节摘要：<revision / sha256 或 absent>
- 候选 revision / 字节摘要：<revision / sha256>
- 规则级决定：<rule ID、create/merge/supersede/skip、approved-intent/implemented、来源 locator/digest>
- 发布检查点：<validated / revision-written / current-published / index-written>
- 归档 locator：<移动后的稳定来源>
- 实际结果与恢复：<已落地、未完成、原 owner 与下一核验动作>

## Ephemeral（不提取，留在归档 change 中）

| Change | 知识项 | 跳过原因 |
|--------|--------|---------|
| <change> | <item> | <未通过毕业标准/触发反毕业标准> |
