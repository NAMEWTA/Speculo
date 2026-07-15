# Person Persistence

本文件是 `person` 的唯一运行契约。`WORKFLOW.md` 只能引用本文件，不得复制 runtime roots、store、change 启动或副作用规则。进入 person workflow 时先读取项目根 `speculo/.speculo/workspace.json`，再执行本文件。

## 运行时根

```xml
<runtime-context>
  <root id="workflow" base="workflows" path="person" />
  <root id="state" base="state" path="person" />
</runtime-context>
```

## 持久化命名空间

```xml
<persistence root="state">
  <store id="index" role="index" kind="file" path="status.json" create="initialize" />
  <store id="changes" role="active" kind="directory" path="changes" create="initialize" />
  <store id="archive" role="archive" kind="directory" path="archive" create="initialize" />
  <store id="knowledge" role="knowledge" kind="directory" path=".config" create="initialize" consumers="docs-sync,retro,knowledge-prune" />
</persistence>
```

## 启动协议

```xml
<sequence>
  <phase id="resolve-runtime" order="1">
    <skill root="skills" path="runtime-context/SKILL.md" activation="required" />
    <completion>workspace、config 与 workflow/state roots 均已解析并通过边界检查；同一运行已解析时复用结果。</completion>
  </phase>
  <phase id="select-change" order="2">
    <artifact root="state" path="status.json" />
    <completion>已选择用户指定或唯一 active change；没有 active change 时原子创建 `changes/YYYY-MM-DD-&lt;kebab-topic&gt;/.status.json` 并更新索引；多个候选时先消歧。</completion>
  </phase>
</sequence>
```

创建 change 时初始化 schema version 1、workflow/name/timestamps、`change_status: active`、空的 `route_history`。已有 change 缺少数组时按空数组读取，在下一次真实更新时补齐，不要求迁移。

## 状态字段

```xml
<state-schema>
  <field name="current_route" type="string|null" />
  <field name="route_history" type="array" />
</state-schema>
```

## 路径与副作用

- route 产物只写当前 change；已声明 knowledge store 只接收 workflow 确认的长期内容。
- 用户要求的项目产物不是 Speculo 运行状态；保存项目相对指针，不把派生绝对路径写入状态。
- 发布、提交、移动或删除外部/项目资源前展示动作并取得明确确认。

