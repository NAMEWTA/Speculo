# Matt Pocock Persistence

本文件是 `matt-pocock` 的唯一运行契约。`WORKFLOW.md` 与 `atomic-skills/*.md` 只能引用本文件，不得复制 runtime roots、store、change 启动或副作用规则。无论从 workflow 还是 atomic wrapper 进入，都先读取项目根 `speculo/.speculo/workspace.json`，再执行本文件。

## 运行时根

```xml
<runtime-context>
  <root id="workflow" base="workflows" path="matt-pocock" />
  <root id="state" base="state" path="matt-pocock" />
  <root id="vendor:matt-pocock" base="vendor" path="matt-pocock" />
</runtime-context>
```

## 持久化命名空间

```xml
<persistence root="state">
  <store id="index" role="index" kind="file" path="status.json" create="initialize" />
  <store id="changes" role="active" kind="directory" path="changes" create="initialize" />
  <store id="archive" role="archive" kind="directory" path="archive" create="initialize" />
  <store id="knowledge" role="knowledge" kind="directory" path="knowledge" create="lazy" consumers="docs-sync,retro,knowledge-prune" />
  <store id="policy" role="policy" kind="directory" path="policy" create="lazy" consumers="docs-sync,knowledge-prune" />
  <store id="integrations" role="integration" kind="directory" path="integrations" create="lazy" />
  <store id="backlog" role="backlog" kind="directory" path="backlog" create="lazy" consumers="retro" />
  <store id="legacy-config" role="legacy-knowledge" kind="directory" path=".config" create="existing-only" legacy="true" consumers="docs-sync,retro,knowledge-prune" />
</persistence>
```

`status.json`、`changes/` 和 `archive/` 是固定骨架；lazy store 只在产生对应内容并确认长期归属时创建。已有 `.config/` 只读，不接收新内容。

## 启动协议

```xml
<sequence>
  <phase id="resolve-runtime" order="1">
    <skill root="skills" path="runtime-context/SKILL.md" activation="required" />
    <completion>workspace、config、workflow/state/vendor roots 均已解析并通过边界与存在性检查；同一运行已解析时复用结果。</completion>
  </phase>
  <phase id="select-change" order="2">
    <artifact root="state" path="status.json" />
    <completion>已选择用户指定或唯一 active change；没有 active change 时原子创建 `changes/YYYY-MM-DD-&lt;kebab-topic&gt;/.status.json` 并更新索引；多个候选时先消歧。</completion>
  </phase>
</sequence>
```

创建 change 时初始化 schema version 1、workflow/name/timestamps、`change_status: active`、空的 `route_history`、`skill_history` 与 `external_refs`。已有 change 缺少这些数组时按空数组读取，在下一次真实更新时补齐，不要求迁移。

## 状态字段

```xml
<state-schema>
  <field name="current_route" type="string|null" />
  <field name="route_history" type="array" />
  <field name="skill_history" type="array" />
  <field name="external_refs" type="array" />
  <field name="legacy_source" type="object|null" />
</state-schema>
```

- route 调用维护 `current_route` 与 `route_history`；direct atomic 调用保持二者不变。
- 每次 atomic wrapper 调用向 `skill_history` 追加 skill id、`direct|route` 模式、进入/完成时间、结果和真实的项目相对产物路径。
- 外部系统结果只写入 `external_refs`；状态不保存派生绝对路径。

## 路径分配

1. route 的 `<artifact>` 指针优先，wrapper 使用调用方已声明路径。
2. direct 调用没有 route 产物声明时，运行时文件由目标 skill 在当前 change 内按需新建；只强制 `change_root` 边界，不强制 `atomic-skills/<id>` 子目录。
3. 项目代码、测试和用户明确要求的项目文档属于项目产物，可写入经确认的项目相对路径；同时把验证或结果指针记录到当前 change。
4. 长期知识、规则和集成配置先在 change 中形成，经确认后才写入已声明的 lazy store。raw skill 中的 `CONTEXT.md`、ADR、`docs/agents/`、`.out-of-scope/` 等逻辑位置分别映射到 `knowledge`、`integrations` 或 `policy`，不在项目根自行创建私有运行状态。
5. 临时原型、数据库、脚本和报告必须删除或吸收；保留的结论写入当前 change。raw skill 指向系统临时目录、当前目录或 `.scratch/` 时，同样受本规则约束。

raw skill 内部提及另一个 `/skill` 时，解析到 `atomic-skills/<skill-id>.md`；只有该 wrapper 可以直接引用对应 vendor `SKILL.md`。

## 副作用边界

- 发布 issue、评论、标签，写 secret，启动后台 agent，提交代码，继续 merge/rebase，合并或删除 worktree 前，展示动作与目标并取得明确确认。
- 已确认动作的结果、URL、commit 或失败状态写入 `external_refs`；敏感值不得写入 change 或状态。
- vendor 内容保持只读；所有路径改写和确认规则由本文件提供。

