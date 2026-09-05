---
name: topic-synthesis
description: 将 Learning Change 作为不可变原料，生成带 claim 级 provenance 的主题综合并显式发布。
---

# Topic Synthesis

1. 只接收 C-consolidate 已确认的 source manifest；按稳定 Change ID 读取当前 locator，禁止依赖旧路径猜测。
2. 对每个 claim 记录 source Change、Lesson/Homework/Review anchor、外部 source id、证据状态、冲突、空白和验证时间；不要把类比或索引摘要当成事实来源。
3. 生成新的 `synthesis/revisions/<version>.md`，旧版本只读保留。综合可以包含未掌握证据，但不得写 `mastered`，除非 R evidence 已存在。
4. 发布 context 前必须再次获得用户确认；发布只更新 topic INDEX/current view 和 provenance，不删除或改写任何 child 原料。

## 引用模板

| claim_id | 陈述 | evidence_status | source_change_id | artifact anchor | external source | verified_at |
| --- | --- | --- | --- | --- | --- | --- |
| CLM-001 | `<claim>` | supported | `<change-id>` | `L-001#heading` | `S-001` | `<ISO-8601>` |
