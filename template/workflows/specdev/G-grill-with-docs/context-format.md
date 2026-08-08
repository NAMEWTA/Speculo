# CONTEXT 格式

本格式用于 `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`。它是当前 change 已确认、供本 change 下游使用的项目规范语言表，不是 workflow 级永久领域知识。每个文件只描述一个 bounded context；多个 context 的关系写入单独 Context Map。

```markdown
# <Bounded Context>

**<规范术语>**：<一到两句项目特有定义。>
_Avoid_: <会造成歧义或已废弃的同义词>

**<另一个术语>**：<一到两句定义。>
_Avoid_: none
```

不包含 owner、最后核验、代码路径、实现差距、change 历史、示例大表、普通编程概念或临时假设。来源和演进历史由 LOG/ADR/Spec 保存。

G 不把该文件复制或合并到永久 `<Path>{roots.state}/specdev/context/</Path>`。只有 A 在 change 完成后验证实现证据、应用毕业标准并获得用户确认，才生成或更新永久术语文件；未毕业内容随归档 change 保留。
