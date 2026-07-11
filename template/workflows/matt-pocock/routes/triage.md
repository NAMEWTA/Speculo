# Triage

## 阶段

```xml
<sequence>
  <phase id="collect" order="1">
    <skill root="vendor:matt-pocock" path="engineering/triage/SKILL.md" activation="adapted" />
    <artifact root="change" path="triage/{item}/record.md" />
    <completion>完整正文、评论、标签、diff、冗余性与私有 out-of-scope 已检查。</completion>
  </phase>
  <phase id="recommend" order="2">
    <completion>类别与状态建议已向维护者展示并等待决定。</completion>
  </phase>
  <phase id="validate-grill" order="3">
    <when>声明需要复现或需求仍不完整。</when>
    <skill root="vendor:matt-pocock" path="productivity/grilling/SKILL.md" activation="conditional" />
    <skill root="vendor:matt-pocock" path="engineering/domain-modeling/SKILL.md" activation="conditional" />
    <completion>事实已验证，问题逐个解决。</completion>
  </phase>
  <phase id="apply" order="4">
    <completion>拟发布评论、标签、关闭动作先本地记录并经确认；结果引用已写回。</completion>
  </phase>
</sequence>
```
