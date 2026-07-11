# Experimental

本 route 不参与默认选择。进入前明确告知能力位于 vendor/in-progress，可能发生破坏性变化。

## 路由

```xml
<routes>
  <route id="loop-me" order="1" root="vendor:matt-pocock" path="in-progress/loop-me/SKILL.md" />
  <route id="wizard" order="2" root="vendor:matt-pocock" path="in-progress/wizard/SKILL.md" />
  <route id="claude-handoff" order="3" root="vendor:matt-pocock" path="in-progress/claude-handoff/SKILL.md" />
  <route id="writing-fragments" order="4" root="vendor:matt-pocock" path="in-progress/writing-fragments/SKILL.md" />
  <route id="writing-beats" order="5" root="vendor:matt-pocock" path="in-progress/writing-beats/SKILL.md" />
  <route id="writing-shape" order="6" root="vendor:matt-pocock" path="in-progress/writing-shape/SKILL.md" />
</routes>
```

所有文件输出改写到当前 change 的 `experimental/<route>/`。启动后台 agent、写 secrets、创建脚本、提交文件或操作外部系统前必须单独确认并记录 receipt。
