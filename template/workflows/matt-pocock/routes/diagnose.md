# Diagnose

## 阶段

```xml
<sequence>
  <phase id="feedback-loop" order="1">
    <instructions root="workflow" path="atomic-skills/diagnosing-bugs.md" activation="required" />
    <artifact root="change" path="diagnosis/feedback-loop.md" />
    <completion>存在一条已运行、能对当前症状变红、快速且确定的命令；否则 blocked。</completion>
  </phase>
  <phase id="diagnose-fix" order="2">
    <artifact root="change" path="diagnosis/report.md" />
    <completion>复现已最小化，假设已验证，修复前已有正确缝合点的回归测试。</completion>
  </phase>
  <phase id="architecture-followup" order="3">
    <when>缺少正确测试缝合点或暴露架构摩擦。</when>
    <instructions root="workflow" path="routes/architecture.md" />
    <completion>架构发现已记录，不阻塞 bug 修复完成。</completion>
  </phase>
</sequence>
```
