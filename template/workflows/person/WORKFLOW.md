---
id: person
type: workflow
workflow: person
name: Person Workflow
description: 以人物方法论为底座并共享独立持久化契约的咨询 workflow
keywords: [person, methodology, consulting, 人物, 方法论]
---

# Person Workflow

先读取 [PERSISTENCE.md](./PERSISTENCE.md)。该文件是 runtime roots、store、change 启动和副作用边界的唯一来源；本入口只负责选择人物方法论 route。

## 进入协议

```xml
<sequence>
  <phase id="load-persistence" order="1">
    <instructions root="workflow" path="PERSISTENCE.md" activation="required" />
    <completion>runtime context 与 current change 已按唯一持久化契约解析。</completion>
  </phase>
</sequence>
```

## 路由

```xml
<routes>
  <route id="mao-zedong-cognitive-os" order="1" root="workflow" path="M-mao-zedong-cognitive-os/M-mao-zedong-cognitive-os.md">
    <when>用户希望以毛泽东方法论分析问题、制定战略或组织行动。</when>
  </route>
</routes>
```

## 依赖

```xml
<dependencies />
```

## 状态转移

```xml
<transitions>
  <transition from="active" to="archived">
    <command root="commands" path="finalize.md" />
    <when>用户确认咨询交付完成且完成门禁通过。</when>
  </transition>
</transitions>
```
