# Experimental

本 route 不参与默认选择。进入前明确告知能力位于 vendor/in-progress，可能发生破坏性变化。

## 路由

```xml
<routes>
  <route id="loop-me" order="1" root="workflow" path="atomic-skills/loop-me.md" />
  <route id="wizard" order="2" root="workflow" path="atomic-skills/wizard.md" />
  <route id="claude-handoff" order="3" root="workflow" path="atomic-skills/claude-handoff.md" />
  <route id="writing-fragments" order="4" root="workflow" path="atomic-skills/writing-fragments.md" />
  <route id="writing-beats" order="5" root="workflow" path="atomic-skills/writing-beats.md" />
  <route id="writing-shape" order="6" root="workflow" path="atomic-skills/writing-shape.md" />
</routes>
```

所有文件输出改写到当前 change 的 `experimental/<route>/`。启动后台 agent、写 secrets、创建脚本、提交文件或操作外部系统前必须单独确认并记录 receipt。
