# Review

## 阶段

```xml
<sequence>
  <phase id="fixed-point" order="1">
    <skill root="vendor:matt-pocock" path="engineering/code-review/SKILL.md" activation="required" />
    <completion>固定点可解析、diff 非空、规范与标准来源已记录。</completion>
  </phase>
  <phase id="parallel-axes" order="2">
    <artifact root="change" path="review/report.md" />
    <completion>标准轴与规范轴相互隔离执行，并排呈现且不重新排名。</completion>
  </phase>
  <phase id="decision" order="3">
    <completion>发现数量、各轴最严重问题和下一步已记录；未经要求不实施修复。</completion>
  </phase>
</sequence>
```
