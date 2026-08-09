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

- backup manifest 的每个 file hash、size 和 symlink 条目与现场一致；存在 symlink 时阻塞。
- plan 的 `backup_manifest_sha256` 与现场一致，`source_decisions` 恰好覆盖 manifest 全部条目，且每个 action 的 `expected_target` 与 active 现场一致。
- 所有迁移后 JSON 可解析。
- workspace、install manifest、项目配置和已安装 workflow 全局状态满足当前版本。
- SpecDev active/archive 索引与目录一致；person 状态满足 schema v1。
- pending marker 只在全部验证通过后从 staged 安装删除。
- 执行后 backup manifest 与内容 hash 不变。
