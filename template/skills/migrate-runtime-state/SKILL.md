---
name: migrate-runtime-state
description: 迁移 Speculo pending 运行时状态；当 migrate-runtime-state command 需要盘点 back、修复配置或原子恢复 workflow/command 持久项时使用。
---

# Migrate Runtime State

以**对账**为主导词：当前模板合同是目标，`back/` 是不可变来源，active runtime 是可能已产生新内容的目标。每个源文件必须得到唯一处置，不按目录整包盲目覆盖。

## 输入

调用方必须提供：

- 已解析的 project、Speculo、state 和 backup roots；
- pending marker 与 backup manifest；
- 允许写入的配置和 runtime state 边界；
- `dry-run | confirmed` 模式和 command 报告 owner；
- 用户对冲突、替换和删除的逐项决定。

缺少任一输入时返回 blocked，不自行推断 command 报告目录或扩大写入范围。

## 过程

### 1. 验证迁移现场

运行：

```bash
node scripts/migrate-runtime-state.mjs inspect --project-root <project-root>
```

核对输出中的 pending marker、源/目标版本、backup manifest 和每个文件 hash。读取所有已安装 workflow 的 INDEX、当前 schema、状态种子与 command state 合同。若 hash 不一致、存在符号链接、pending marker 缺失或另一个 staging/rollback 目录仍存在，停止。

**完成标准**：来源未变、roots 唯一、所有动态路径有 owner，backup 中每个条目均已枚举。

### 2. 建立逐项对账

读取 [`references/migration-contract.md`](references/migration-contract.md)，为 manifest 中每个条目选择唯一动作。配置按字段合并；状态索引必须与真实 change/archive 目录重建一致；永久知识、sidecar、command cursor 和报告按 owner 恢复；未知项保持 `unresolved`，不得静默删除。

同时读取 active 目标。源和目标都发生变化时比较内容与 owner，不以 backup 或新骨架的时间先后自动决定覆盖。

**完成标准**：每个 backup 条目和每个将被覆盖/删除的 active 条目都有动作、理由、目标、风险、验证和用户决定；`unresolved` 为零才可执行。

### 3. 生成确定性计划

生成 schema v2 JSON plan。`backup_manifest_sha256` 锁定 inspect 现场；`source_decisions` 必须逐项覆盖 manifest 中的每个文件且不得包含 `unresolved`；每个 action 必须以 `source_decision` 显式引用唯一来源决策，且动作、decision disposition 与目标一一对应：

```json
{
  "schema_version": 2,
  "backup_manifest_sha256": "<inspect 返回的 sha256>",
  "source_decisions": [
    {"path": "config.json", "disposition": "merge-json", "target": "config.json"},
    {"path": "state/specdev/context.md", "disposition": "restore", "target": ".speculo/specdev/context.md"},
    {"path": "state/workspace.json", "disposition": "keep-current", "target": ".speculo/workspace.json"}
  ],
  "actions": [
    {"kind": "copy", "source_decision": "state/specdev/context.md", "from": "state/specdev/context.md", "to": ".speculo/specdev/context.md", "expected_target": "absent"},
    {"kind": "replace-json", "source_decision": "config.json", "to": "config.json", "value": {}, "expected_target": "file:<sha256>"}
  ]
}
```

`from` 必须与 `source_decision` 相同且相对 backup root；`copy ↔ restore`、`replace-json ↔ merge-json|replace-json`、`keep-current ↔ keep-current`、`remove-current ↔ remove-current`。只有 `keep-current` 决策可省略 action。`to` 只能是 `config.json` 或 `.speculo/` 内非受保护路径。每个 action 都使用 `fingerprint` 输出锁定 `expected_target`；目标相互重叠时拆成不重叠动作。Plan 写入调用方声明的临时位置，报告保存等价 Markdown 表格；正式 state 不保存第二份 plan。

**完成标准**：计划可由脚本解析，路径均在授权边界内，受管理静态资产和 `back/` 不会成为目标。

### 4. Dry-run 门

默认在计划报告完成后停止。向调用方返回文件总数、各动作数量、冲突、阻塞、目标漂移 hash 和验证清单。未取得对当前完整计划的明确确认时，不调用 apply。

**完成标准**：除 command 报告外没有持久写入；用户看到全部覆盖、替换和删除动作。

### 5. 原子执行

仅在 `confirmed` 模式运行：

```bash
node scripts/migrate-runtime-state.mjs apply \
  --project-root <project-root> \
  --plan <temporary-plan.json> \
  --confirmed
```

脚本重验来源和目标后，在项目根的临时 staging 中构建完整 Speculo 安装，执行计划、验证 JSON 与核心状态合同、清除 staged pending marker，再通过 rename 替换 active `speculo/`。失败时恢复原 active 安装；backup 始终保留。

**完成标准**：脚本退出 0，active 目标已重读，pending marker 不存在，backup manifest hash 未变，无 staging/rollback 残留。

### 6. 返回审计结果

返回调用方：执行模式、源/目标版本、动作结果、验证、rollback 状态、backup 路径、未迁移项和残余风险。调用方把结果追加到原 command 报告。

**完成标准**：报告能够从 backup、plan 摘要和 active 结果重建迁移；失败不伪装成部分成功。
