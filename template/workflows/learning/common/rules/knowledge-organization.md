# 主题知识组织与溯源

被动入口是 `context/INDEX.md` -> `domains/<domain>/topics/<topic-id>/INDEX.md` -> 精确主题文件。主题视图是 C 生成的派生物，不是原始课程或作业的替代品。

每个 claim 记录稳定 `claim_id`、陈述、`evidence_status`（`draft|supported|contested|unresolved`）、source Change ID、Lesson/Homework/Review anchor、外部 source ID、验证时间和冲突/空白。所有链接用 `{roots.*}` aliases；物理 relocation 后由 `locations.json` 按 Change ID 解析当前路径。

只有 R 的真实 retention evidence 才能把 claim/status 标为 `retention_verified` 或 `mastered`。C 可以综合未掌握材料，但必须保留 evidence status，不能从综合文本推断掌握。
