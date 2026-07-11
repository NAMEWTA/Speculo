# Productivity

## 路由

```xml
<routes>
  <route id="handoff" order="1">
    <skill root="vendor:matt-pocock" path="productivity/handoff/SKILL.md" activation="adapted" />
    <artifact root="change" path="handoffs/{topic}.md" />
    <when>需要跨会话或分叉上下文。</when>
  </route>
  <route id="teach" order="2">
    <skill root="vendor:matt-pocock" path="productivity/teach/SKILL.md" activation="adapted" />
    <artifact root="change" path="teaching/" />
    <when>用户要跨会话学习主题。</when>
  </route>
  <route id="writing-great-skills" order="3">
    <skill root="vendor:matt-pocock" path="productivity/writing-great-skills/SKILL.md" activation="required" />
    <artifact root="change" path="skill-authoring/report.md" />
    <when>用户要设计或审查 skill。</when>
  </route>
</routes>
```

原 handoff 的系统临时目录与 teach 的当前目录均替换为上述 change 内路径。
