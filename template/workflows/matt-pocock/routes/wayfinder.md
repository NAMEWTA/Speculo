# Wayfinder

## 阶段

```xml
<sequence>
  <phase id="name-destination" order="1">
    <instructions root="workflow" path="atomic-skills/wayfinder.md" activation="required" />
    <instructions root="workflow" path="atomic-skills/grilling.md" activation="required" />
    <instructions root="workflow" path="atomic-skills/domain-modeling.md" activation="required" />
    <completion>目的地与范围边界已确认。</completion>
  </phase>
  <phase id="map-frontier" order="2">
    <artifact root="change" path="wayfinder/map.md" />
    <artifact root="change" path="wayfinder/tickets/" />
    <completion>只创建当前可明确的 tickets，战争迷雾留在 map。</completion>
  </phase>
  <phase id="walk-one-ticket" order="3">
    <completion>一次会话只领取并解决一个前沿 ticket；本地先记录，外发需确认。</completion>
  </phase>
  <phase id="handoff" order="4">
    <when>路径已清晰。</when>
    <instructions root="workflow" path="routes/idea-to-delivery.md" />
    <completion>已转入 spec 或 implement，未把寻路当成交付。</completion>
  </phase>
</sequence>
```
