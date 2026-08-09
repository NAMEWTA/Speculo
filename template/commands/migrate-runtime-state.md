---
id: migrate-runtime-state
type: command
name: Migrate Runtime State
description: 盘点 pending Speculo 运行时备份，生成可确认迁移计划，并在明确授权后原子修复配置与持久状态。
keywords: [runtime-migration, pending, back, 状态迁移, 配置修复]
---

# Migrate Runtime State 命令

本命令只处理 `speculo init` 已标记为 pending 的运行时迁移。它不替代 `speculo init`，不迁移静态 commands、skills 或 workflow 包，也不修改 `<Path>{roots.state}/back/</Path>`。

## 报告

写入：`<Path>{roots.state}/commands/migrate-runtime-state/<YYYY-MM-DD>-workspace-runtime-state[-NN].md</Path>`。

报告记录 command id、生成时间、project root、源/目标版本、pending blockers、备份 manifest hash 结论、逐路径动作、冲突决策、确认状态、执行结果、回滚结果和残余风险。同名报告从 `-01` 选择最小未占用编号，禁止覆盖。

## 执行

1. 从当前目录向上解析唯一 `speculo/.speculo/workspace.json`，读取 `speculo/.speculo/migration.json`、`speculo/.speculo/back/manifest.json`、`speculo/config.json` 和已安装 workflow INDEX。缺少 pending marker 或 marker 不为 `status: pending` 时停止，不创建可执行计划。
2. 读取 `<Path>{roots.skills}/migrate-runtime-state/SKILL.md</Path>`，传入 project root、state root、backup root、pending marker、允许写入的 `speculo/config.json` 与 runtime state 边界，以及本 command 的报告路径。
3. 先调用 skill 的 inspect/dry-run 分支，穷尽备份中的每个文件并生成 `restore | merge-json | replace-json | keep-current | remove-current | unresolved` 映射。任何 `unresolved` 都阻塞执行；可执行 plan 的 `source_decisions` 必须恰好覆盖 backup manifest，且锁定 manifest sha256。
4. 把完整映射、覆盖/删除动作、验证命令和预期副作用写入报告并展示摘要。初始“修复迁移”请求不算执行确认。
5. 只有用户明确批准当前计划后，把同一计划以 `confirmed` 模式交回 skill。执行前必须重验 marker、manifest hashes、每个 action 的 `expected_target` 和计划内容未漂移。
6. skill 返回后重读 `speculo/config.json`、`<Path>{roots.state}/install.json</Path>`、pending marker、所有迁移目标和备份 manifest；运行已安装 workflow 的包级校验。pending marker 仍存在或任一验证失败时报告 blocked，不宣称完成。
7. 将执行结果和 rollback 状态追加到原报告。成功时返回报告路径、保留的 backup 路径和已迁移 namespace；失败时返回原 active 安装是否恢复、未完成动作与恢复条件。

## 确认边界

- Dry-run 只允许创建本 command 的 Markdown 报告和进程外临时 plan；不得修改配置、workflow state、command state 或备份。
- `replace-json`、`remove-current` 和任何覆盖动作必须在计划中逐项列出并取得确认。
- 备份 hash 不一致、路径越界、目标漂移、未知 owner、JSON 无法修复或验证失败时停止。
- `back/` 始终只读并保留为最近一次 rollback 来源；成功迁移不删除它。

## 完成标准

- pending marker、backup manifest 和全部文件均有结论；
- 未确认路径除报告外无写入；
- 已确认执行通过 staging、原子替换和失败回滚；
- 配置与所有已安装 workflow 状态满足当前合同；
- pending marker 已清除，最近备份仍完整；
- 报告不覆盖且足以重建每个决策与动作。
