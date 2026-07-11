# Workflow 范围契约

docs-sync 必须遵循每个 workflow 的 `WORKFLOW.md`、持久化声明与确认规则。`docs-sync.json` 是 command 拥有的标准延迟 sidecar，不属于 workflow `_state` 固定骨架。

## 发现

1. 从 `speculo/workflows/*/WORKFLOW.md` 发现已安装 workflow。
2. 每个包必须有匹配的 `speculo/.speculo/<workflow>/` 状态根；包或状态根单边缺失时阻塞，不猜测归属。
3. 读取 `<runtime-context>`、`<persistence>`、固定 archive 和所有 `consumers` 包含 `docs-sync` 的 store。
4. 状态根存在但没有已安装 package 时只报告 orphan，不创建 sidecar。

## Sidecar v1

每个已安装 workflow 首次 docs-sync 都创建：

```json
{
  "schema_version": 1,
  "workflow": "example",
  "manifest_path": "speculo/.speculo/example/docs-sync.json",
  "project_targets": [],
  "state_targets": [],
  "scope_revision": 1,
  "scope_confirmed_at": "ISO-8601"
}
```

目标使用 `{ "path": "...", "kind": "file | directory" }`：

- `project_targets` 使用项目相对路径，记录该 workflow 负责维护的项目文档。
- `state_targets` 使用 workflow 状态根相对路径，只能位于 `consumers` 包含 `docs-sync` 的已声明 store。
- Directory 目标递归覆盖其中已跟踪的 Markdown、MDX、reStructuredText 和 AsciiDoc；其他格式必须作为 file 明确列出。
- 禁止绝对路径、反斜杠、`..`、项目根目录、无界 glob、`.git`、固定 `status.json/changes/archive` 和 sidecar 自身。

## 首次确认与修订

1. Bootstrap 同时展示全局候选，以及每个 workflow 的 project/state 候选、来源和风险。
2. 用户一次确认后写入全局 state 与全部 sidecar；没有候选的 workflow 也写空清单。
3. 一个目标只能归属全局或一个 workflow；重叠、父子目录交叉或同一路径多 owner 必须先消歧。
4. 后续新增、扩大、移除或转移目标必须再次展示完整新范围；确认后增加 `scope_revision` 并更新时间。
5. 首次确认只授予范围内常规创建和改写，不授权整文件/目录删除或受保护知识写入。

## Archive 与知识

- 固定 archive 始终可作为只读证据；优先读取本次区间新增或变更、且与受影响模块或术语相关的高信号产物。
- 归档中的稳定决策、术语、经验和文档漂移信号只提炼结论并保留来源路径，不复制大段正文。
- `existing-only` store 永远只读。RULES/policy、ADR、CONTEXT、语义冲突和任何知识文件删除均进入 `propose-only`，按目标 workflow 规则取得逐次确认。
- 不跨 workflow 搬运知识；共享结论必须先确认唯一归属。

完成标准：所有已安装 workflow 都有有效 sidecar；每个有效目标都有唯一 owner、声明边界和确认记录；所有受保护动作均未越权。
