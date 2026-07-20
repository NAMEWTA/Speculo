# Idea To Delivery

## 阶段

```xml
<sequence>
  <phase id="grill" order="1">
    <instructions root="workflow" path="atomic-skills/grill-with-docs.md" activation="conditional">
      <when>当前任务位于已有代码仓，需要同步领域语言与 ADR 候选。</when>
    </instructions>
    <instructions root="workflow" path="atomic-skills/grill-me.md" activation="conditional">
      <when>用户显式要求 grill-me，或计划/设计不依赖现有代码仓。</when>
    </instructions>
    <instructions root="workflow" path="atomic-skills/grilling.md" activation="required" />
    <instructions root="workflow" path="atomic-skills/domain-modeling.md" activation="conditional">
      <when>存在代码仓并需要沉淀领域语言或 ADR 候选。</when>
    </instructions>
    <artifact root="change" path="decision-log.md" />
    <completion>一次只确认一个决策；所有关键分支均已清晰且用户确认达成共识后，才允许形成 Plan 或进入 spec。CONTEXT/ADR 仅在确认后写入 knowledge namespace。</completion>
  </phase>
  <phase id="detour" order="2">
    <when>问题需要一手资料或可运行/UI 答案。</when>
    <instructions root="workflow" path="routes/research-prototype.md" />
    <completion>答案与来源已回填 decision-log，临时代码已删除。</completion>
  </phase>
  <phase id="spec" order="3">
    <instructions root="workflow" path="atomic-skills/to-spec.md" activation="adapted" />
    <artifact root="change" path="spec/spec.md" />
    <completion>spec 先本地落盘；外发 tracker 需要单独确认。</completion>
  </phase>
  <phase id="tickets" order="4">
    <when>工作跨多个上下文窗口。</when>
    <instructions root="workflow" path="atomic-skills/to-tickets.md" activation="adapted" />
    <artifact root="change" path="tracker/tickets/README.md" />
    <completion>垂直切片与阻塞边已获用户批准，外发引用已回写。</completion>
  </phase>
  <phase id="implement" order="5">
    <instructions root="workflow" path="atomic-skills/implement.md" activation="adapted" />
    <instructions root="workflow" path="atomic-skills/tdd.md" activation="required" />
    <artifact root="change" path="implementation/log.md" />
    <completion>每个切片已验证；commit 仅在用户确认后执行。</completion>
  </phase>
  <phase id="review" order="6">
    <instructions root="workflow" path="routes/review.md" />
    <completion>标准轴与规范轴均已有报告。</completion>
  </phase>
  <phase id="finalize" order="7">
    <command root="commands" path="finalize.md" />
    <completion>全局完成门禁通过并归档，或明确 blocked。</completion>
  </phase>
</sequence>
```

## 状态转移

```xml
<transitions>
  <transition from="grill" to="spec"><when>决策完整且无需继续 detour。</when></transition>
  <transition from="spec" to="tickets"><when>实现跨上下文。</when></transition>
  <transition from="spec" to="implement"><when>单上下文可完成。</when></transition>
  <transition from="review" to="implement"><when>审查发现必须修复的问题。</when></transition>
</transitions>
```
