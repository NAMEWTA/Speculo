# Research And Prototype

## 阶段

```xml
<sequence>
  <phase id="research" order="1">
    <when>答案需要当前仓库之外的一手来源。</when>
    <instructions root="workflow" path="atomic-skills/research.md" activation="conditional" />
    <artifact root="change" path="research/{topic}.md" />
    <completion>每项结论有一手来源，文件留在当前 change。</completion>
  </phase>
  <phase id="prototype" order="2">
    <when>状态、逻辑或 UI 需要可运行答案。</when>
    <instructions root="workflow" path="atomic-skills/prototype.md" activation="conditional" />
    <artifact root="change" path="prototypes/{topic}/answer.md" />
    <completion>答案已保留；一次性代码、数据库和路由已删除或明确吸收进实现。</completion>
  </phase>
</sequence>
```
