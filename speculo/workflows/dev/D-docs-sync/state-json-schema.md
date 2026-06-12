# state 文件 Schema（docs-sync 持久化状态）

**默认存储位置**：`speculo/.speculo/dev/docs-sync-state.json`

本 workflow 在首次运行时会按默认路径创建；后续读写均以同一路径为准。不要把 docs-sync state 放到仓库根目录。

**定位**：

- docs-sync workflow **唯一**的跨 change 持久化状态
- 每次成功同步后原子化写入
- 必须跟随仓库提交到 git（作为同步基线的事实来源）
- **不放在 workflow 资产目录内**：workflow 目录是只读知识资产，状态属于项目 `speculo/.speculo/`

**初始化模板**：`../_templates/docs-sync-state-template.json`

## 字段定义

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| `schema_version` | integer | ✓ | 当前 `1`；字段破坏性变化时递增 |
| `skill` | string | ✓ | 固定为 `"docs-sync"`，便于多技能共用项目根目录时辨识 |
| `state_path` | string | ✓ | 自描述字段：state 文件相对仓库根的路径；协助协作者理解文件位置 |
| `tracked_docs` | string[] | ✓ | 本项目纳入同步的文档路径（相对仓库根）；首次运行后由用户确认写入 |
| `last_sync_sha` | string (40 hex) \| `null` | ✓ | 上次成功同步后记录的 commit SHA；下次 diff 的起点；首次运行前为 `null` |
| `last_sync_short` | string (7 hex) \| `null` | ✓ | `last_sync_sha` 的前 7 位，便于日志阅读 |
| `last_sync_commit_subject` | string \| `null` | ✓ | 上次基线 commit 的 subject 行 |
| `last_sync_commit_date` | string (ISO 8601) \| `null` | ✓ | 上次基线 commit 的 author date |
| `last_sync_run_at` | string (ISO 8601 UTC) \| `null` | ✓ | 本次同步**完成写入**时刻；与 `last_sync_commit_date` 不同 —— 前者是"我什么时候做的"，后者是"基线 commit 什么时候创建的" |
| `previous_sync_sha` | string (40 hex) \| `null` | ✓ | 上一次的 `last_sync_sha`；首次运行时为 `null` |
| `total_syncs` | integer | ✓ | 累计触发次数（含空同步） |
| `synced_docs` | string[] | ✓ | 本次**实际被修改**的对外文档文件名数组；空同步时为 `[]` |

**禁止**放入的字段：

- commit 详细 diff（太大，用 git 现取）
- 用户个人信息
- 密钥 / token
- 绝对路径（影响跨环境协作）

## 典型状态

### 首次运行前（骨架 / 模板刚复制）

```json
{
  "schema_version": 1,
  "skill": "docs-sync",
  "state_path": "speculo/.speculo/dev/docs-sync-state.json",
  "tracked_docs": [],
  "last_sync_sha": null,
  "last_sync_short": null,
  "last_sync_commit_subject": null,
  "last_sync_commit_date": null,
  "last_sync_run_at": null,
  "previous_sync_sha": null,
  "total_syncs": 0,
  "synced_docs": []
}
```

### 建立基线后（首次运行完成）

```json
{
  "schema_version": 1,
  "skill": "docs-sync",
  "state_path": "speculo/.speculo/dev/docs-sync-state.json",
  "tracked_docs": ["README.md", "CHANGELOG.md"],
  "last_sync_sha": "2d16d7a4d7f5da165c565b9aa3265824be133214",
  "last_sync_short": "2d16d7a",
  "last_sync_commit_subject": "chore: initial release",
  "last_sync_commit_date": "2026-05-10T09:48:14+08:00",
  "last_sync_run_at": "2026-05-10T12:00:00Z",
  "previous_sync_sha": null,
  "total_syncs": 0,
  "synced_docs": []
}
```

### 常规同步（实际改了两份文档）

```json
{
  "schema_version": 1,
  "skill": "docs-sync",
  "state_path": "speculo/.speculo/dev/docs-sync-state.json",
  "tracked_docs": ["README.md", "CHANGELOG.md"],
  "last_sync_sha": "abc1234def5678...",
  "last_sync_short": "abc1234",
  "last_sync_commit_subject": "feat(cli): add --json to status",
  "last_sync_commit_date": "2026-05-15T10:20:30+08:00",
  "last_sync_run_at": "2026-05-15T14:00:00Z",
  "previous_sync_sha": "2d16d7a4d7f5da165c565b9aa3265824be133214",
  "total_syncs": 3,
  "synced_docs": ["README.md", "CHANGELOG.md"]
}
```

### 空同步（diff 全是文档自身）

```json
{
  "schema_version": 1,
  "skill": "docs-sync",
  "state_path": "speculo/.speculo/dev/docs-sync-state.json",
  "tracked_docs": ["README.md", "CHANGELOG.md"],
  "last_sync_sha": "ffe9876abc5432...",
  "last_sync_short": "ffe9876",
  "last_sync_commit_subject": "docs(readme): fix typo",
  "last_sync_commit_date": "2026-05-16T09:00:00+08:00",
  "last_sync_run_at": "2026-05-16T11:00:00Z",
  "previous_sync_sha": "abc1234def5678...",
  "total_syncs": 4,
  "synced_docs": []
}
```

## 写入规范

1. **原子化**：先写 `<state>.tmp`，再 `mv <state>.tmp <state>`。直接覆盖可能导致中断时 state 被截断
2. **格式化**：使用 2 空格缩进，尾部换行
3. **字段顺序**：保持上述表格顺序，便于 diff 阅读
4. **不保留注释**：JSON 标准不支持注释；所有解释都放本文件

## 读取容错

读取 state 文件时按以下降级链处理：

1. 文件不存在 → 首次运行流程：复制 `../_templates/docs-sync-state-template.json` 到 `speculo/.speculo/dev/docs-sync-state.json`，基线设为当前 HEAD，请用户确认 `tracked_docs`
2. JSON 解析失败 → 报错退出，要求用户手动修复或删除
3. `schema_version > 1` → 报错退出，提示技能版本过旧
4. `last_sync_sha` 不是 40 字符十六进制且不为 `null` → 视为损坏，回退到首次运行

## 版本演进规则

`schema_version` 只在**破坏性**字段变化时递增：

- 加字段（optional 或有默认值）：**不**递增
- 删字段 / 改字段类型 / 改字段语义：递增

递增时必须在本文件追加"vN → vN+1 迁移"小节，描述如何处理老格式。

## 与 git 的协作

- state 文件**提交到 git**，作为仓库的一部分
- `last_sync_sha` 引用的 commit 必须在当前分支的历史中
- 如果多人协作导致 state 文件冲突：保留 `last_sync_sha` 值较新（即在 git 历史中更靠后）的那个，`total_syncs` 取较大值，`previous_sync_sha` 取被保留一方的值

## 不要做的事

- 不要把 state 文件放进 `.gitignore`
- 不要手动编辑 `last_sync_sha`（除非在修复损坏状态）
- 不要把敏感信息、机器信息、用户信息写入
- 不要让 `total_syncs` 回退
- 不要把 state 文件放回 workflow 资产目录——它属于项目 `speculo/.speculo/` 状态，不属于 framework 资产
