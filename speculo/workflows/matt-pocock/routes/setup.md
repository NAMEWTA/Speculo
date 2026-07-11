# Route Setup

仅在目标 route 缺少配置时读取原 setup skill；保持其探索和逐项确认方法，但使用 Matt 已声明的 state namespace。

## 阶段

```xml
<sequence>
  <phase id="discover-config" order="1">
    <skill root="vendor:matt-pocock" path="engineering/setup-matt-pocock-skills/SKILL.md" activation="adapted" />
    <completion>已展示仓库、tracker 和领域文档现状。</completion>
  </phase>
  <phase id="configure-tracker" order="2">
    <when>route 需要 issue tracker。</when>
    <template root="vendor:matt-pocock" path="engineering/setup-matt-pocock-skills/issue-tracker-local.md" />
    <artifact root="state" path="integrations/issue-tracker.md" />
    <completion>用户已确认 GitHub、GitLab、本地或其他 tracker；本地 tracker 根为当前 change/tracker。</completion>
  </phase>
  <phase id="configure-triage" order="3">
    <when>route 为 triage 或 wayfinder。</when>
    <template root="vendor:matt-pocock" path="engineering/setup-matt-pocock-skills/triage-labels.md" />
    <artifact root="state" path="integrations/triage-labels.md" />
    <completion>五个角色已映射到真实标签。</completion>
  </phase>
  <phase id="configure-domain" order="4">
    <when>route 会读取或维护领域语言。</when>
    <template root="vendor:matt-pocock" path="engineering/setup-matt-pocock-skills/domain.md" />
    <artifact root="state" path="knowledge/domain.md" />
    <completion>domain.md 指向本 workflow 的 knowledge/context/ 与 knowledge/adr/，未修改项目根 AGENTS/CLAUDE/docs。</completion>
  </phase>
</sequence>
```

## 状态转移

```xml
<transitions>
  <transition from="missing-config" to="configured">
    <when>目标 route 的必要配置均已由用户确认并写入声明 namespace。</when>
  </transition>
</transitions>
```
