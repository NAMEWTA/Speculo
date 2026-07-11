# Merge Conflicts

## 阶段

```xml
<sequence>
  <phase id="inspect-intent" order="1">
    <skill root="vendor:matt-pocock" path="engineering/resolving-merge-conflicts/SKILL.md" activation="required" />
    <artifact root="change" path="merge-conflicts/record.md" />
    <completion>每个冲突双方的一手意图已查明。</completion>
  </phase>
  <phase id="resolve-verify" order="2">
    <completion>冲突全部解决、自动化检查通过；没有发明新行为或执行 abort。</completion>
  </phase>
  <phase id="continue" order="3">
    <completion>继续 merge/rebase 与 commit 前已展示动作并获得确认。</completion>
  </phase>
</sequence>
```
