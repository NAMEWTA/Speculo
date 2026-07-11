# Finalize And Archive

归档是破坏性目录移动，调用方必须先展示完整计划并取得明确确认。

## 共同预检

- change 名称符合日期 kebab 规则（格式校验来源与 `runtime-context/SKILL.md` 第4步相同，创建时已保证；此处为冗余验证），且 `.status.json` 可解析。
- 源位于 runtime context 的 `changes_root`，目标位于 `archive_root/<YYYY-MM>/<change>`。
- 目标不存在，workflow `status.json` 与 change 状态一致。
- worktree 模式已经合并回目标分支并清理，或调用方明确记录 blocked。

## finalize-active

1. 要求 `verification_status: verified`。
2. 在当前 change 写 `completion-summary.md`，记录交付边界、证据指针和遗留事项。
3. 将 `change_status` 置为 `completed`；若 workflow 允许沉淀经验，只写入其声明的 knowledge store。
4. 展示归档计划并等待确认，随后执行共同归档步骤。

## archive-completed

1. 仅接受 `change_status: completed`，不重新运行完成门控。
2. 批量模式先为全部候选完成共同预检；任一冲突、malformed 或 broken change 会阻塞整批动作。
3. 展示逐项计划并等待一次明确确认，随后按稳定顺序执行共同归档步骤。

## 共同归档步骤

1. 创建 archive 月目录并移动整个 change。
2. 从 workflow `status.json#active` 删除该 change。
3. 更新已移动的 `.status.json`：`change_status: archived`、`archived: true`、project-relative `archive_path`。
4. 重新读取目标、索引和状态；失败时返回已完成/未完成清单，不猜测成功。

完成标准：源不存在、目标完整、active 索引已移除且归档状态字段一致。
