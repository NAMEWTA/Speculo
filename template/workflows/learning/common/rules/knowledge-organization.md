# 图书式知识组织

Learning 只使用 Markdown 目录和精确链接：`context/INDEX.md` 指向领域 `INDEX.md`，领域索引指向具体知识文件。允许 `rg` 修复索引，但不建设向量、Embedding、chunk、相似度或 rerank 层。

领域目录使用稳定 kebab id；领域类型为 project、product、subject、language 或 skill。每个领域包含 `INDEX.md`、`overview.md`，并按真实需要创建 `concepts/`、`methods/`、`adr/`，不为空架构预建无用途目录。

知识文件必须包含元数据表：Knowledge ID、状态、前置知识、相关知识、掌握证据、最近验证、下次复习；正文包含当前理解、心智模型、示例与应用、常见误区、来源与证据。状态只允许 `mastered | review_due | needs_refresh | superseded`。

同主题存在时合并当前真相；新事实推翻旧结论时改写当前文件并记录 `supersedes` 归档证据；仅相关时互链，不复制正文。更新顺序为知识叶子、领域 INDEX、context/INDEX、REVIEW。索引只保存导航摘要，不保存课程全文或会话历史。
