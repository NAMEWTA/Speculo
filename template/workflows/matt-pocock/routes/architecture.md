# Architecture

## 阶段

```xml
<sequence>
  <phase id="scan" order="1">
    <skill root="vendor:matt-pocock" path="engineering/improve-codebase-architecture/SKILL.md" activation="adapted" />
    <skill root="vendor:matt-pocock" path="engineering/codebase-design/SKILL.md" activation="required" />
    <artifact root="change" path="architecture/candidates.html" />
    <completion>报告写入当前 change 而非系统临时目录，候选使用统一设计词汇。</completion>
  </phase>
  <phase id="select-grill" order="2">
    <skill root="vendor:matt-pocock" path="productivity/grilling/SKILL.md" activation="required" />
    <skill root="vendor:matt-pocock" path="engineering/domain-modeling/SKILL.md" activation="required" />
    <artifact root="change" path="architecture/design.md" />
    <completion>用户选择的候选已遍历设计树，拒绝理由和 ADR 候选已确认。</completion>
  </phase>
  <phase id="deliver" order="3">
    <instructions root="workflow" path="routes/idea-to-delivery.md" />
    <completion>选中设计已进入 spec 或 implement。</completion>
  </phase>
</sequence>
```
