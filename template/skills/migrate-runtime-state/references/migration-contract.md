# Runtime migration contract

## 权威顺序

1. 当前模板中的 workspace、workflow INDEX、schema 和 `_state` 种子决定目标结构。
2. `back/` 保存刷新前事实，始终只读。
3. active runtime 中 pending 后产生的合法用户内容不能被静默覆盖。
4. 用户对真实冲突的当前明确决定优先，但不能授权路径逃逸、损坏 backup 或伪造 schema 成功。

## 动作选择

| 情况 | 动作 |
|---|---|
| backup 有、active 无、owner 仍存在 | `copy` |
| JSON schema 相同且只缺新默认字段 | `replace-json`，值为递归合并结果，旧用户值优先 |
| 状态 schema 可从目录事实确定性重建 | `replace-json`，报告逐字段来源 |
| active 是当前模板管理的 workspace/install metadata | `keep-current` |
| backup 与 active 内容相同 | `keep-current` |
| active 在 pending 后有新内容 | 比较后由用户选择 `keep-current`、`copy` 或 `replace-json` |
| owner 已删除但内容有历史价值 | 保持 `unresolved`，由用户选择归档目标；不得放入虚构 namespace |
| 文件损坏且无法从其他权威事实重建 | 保持 `unresolved` |

## SpecDev 对账

- 全局状态只恢复当前 schema 允许的字段。
- `active` 从仍位于 `changes/` 且 change 状态为 active/blocked/completed 的真实目录核对；不得创建虚假 change。
- `archived` 从 `archive/YYYY-MM/<change>/` 核对，active/archived 不得重叠。
- `config.json` 保留语言、Git、执行、验证与规划偏好，并补入当前 schema 的必需默认值。
- SpecDev config v3/v4 升级为 v5 时，`execution.max_parallel` 只作为旧并发偏好的输入，保留为正整数的 `execution.max_implementation_agents`；补齐 `max_integration_attempts` 与 planning 原型变体配置。删除旧的自动提交和条件 worktree 开关，不把它们解释为授权。
- change-status v3 只有在 `worktrees` 缺失或为空时才可确定性升级为 v4；存在旧 worktree 记录时，必须逐 Ticket 重建 implementation owner、source commit、candidate/result、E2E disposition 和父分支包含关系。v4 runtime 不得自动升级为 v5：旧状态无法可靠推断 execution authorization 或 Lead leadership，必须保持 pending 并显式对账。
- active Goal Plan 不是 v6 时必须重新规划 Lead、workspace 与 integration gate；不能只改 frontmatter 版本号。
- 已声明为 v4 的 SpecDev config，以及已声明为 v5 的 global status、change-status 和 Goal Plan，必须完整满足当前 schema：必需字段、类型、枚举、嵌套对象和 `additionalProperties` 边界都通过后才能自动保留。不得为不完整状态静默补默认值，也不得只扫描少量标记字段。
- worktree `removed` 只接受为 `integrated` 后的清理终态；source checkpoint、passed candidate/result、验证、E2E disposition 和 Evidence 必须完整保留。
- `.config/`、`adr/`、`context/`、`research/`、`changes/`、`archive/` 和声明的 sidecar 都是持久项。
- Command Markdown 报告和具有当前 owner 的 `state.json` 均迁移；未知 command state 保持 unresolved。

## 路径边界

允许目标：

- `config.json`
- `.speculo/commands/**`
- `.speculo/<installed-workflow>/**`

受保护目标：

- `.speculo/back/**`
- `.speculo/workspace.json`
- `.speculo/install.json`
- `.speculo/migration.json`（只由脚本在验证成功后清除）
- `commands/**`、`skills/**`、`workflows/**` 静态资产

所有路径必须使用 POSIX 相对路径，不得包含空段、`.`、`..`、绝对路径或符号链接逃逸。

## 验证

- backup manifest 的每个 file hash、size，以及每个 symlink 的类型和 link target 都必须与现场一致；link 本身保留为 pending 事实，不能被自动恢复到 active runtime。
- plan 的 `backup_manifest_sha256` 与现场一致，`source_decisions` 恰好覆盖 manifest 全部条目；每个 action 必须显式 `source_decision`，且只可实现该 decision 的同目标、同 disposition 动作。除 `keep-current` 外，每个 decision 必须恰有一个 action；每个 action 的 `expected_target` 与 active 现场一致。
- action 后、删除 staged marker 前、原子替换后都递归拒绝 active runtime 中的 symlink；任何失败均恢复原 active 安装。
- 所有迁移后 JSON 可解析。
- workspace、install manifest、项目配置和已安装 workflow 全局状态满足当前版本。
- SpecDev active/archive 索引与目录一致；SpecDev config 满足 v5 合同，global status 满足 v5 合同，change-status 满足 v6 合同，Goal Plan 满足 v6 合同；person 状态满足 schema v1。
- pending marker 只在全部验证通过后从 staged 安装删除。
- 执行后 backup manifest 与内容 hash 不变。
