# Report Contract

## Output

每次成功 assessment 创建：

```text
<Path>{roots.state}/skills/upstream-fork-sync/{change}/state.json</Path>
<Path>{roots.state}/skills/upstream-fork-sync/{change}/diff-report.md</Path>
<Path>{roots.state}/skills/upstream-fork-sync/{change}/conflict-report.md</Path>
```

首份无编号，冲突时从 `-01` 选择最小未占用编号。整个 change 先在同一 state 根暂存，再原子 rename；不得覆盖或留下半成品目录。

## Diff report

每个仓库包含：

- checkpoint 来源、已集成 upstream SHA、观测 upstream SHA、product SHA、merge-base、mirror SHA 和 freshness；
- `integrated_upstream_sha..observed_upstream_sha` 的有序提交；
- 完整 name-status 与 numstat 文件清单；
- product 自 checkpoint 后也修改的路径；
- repository map 风险 glob 命中的路径；
- 使用冻结 SHA 的复现命令；
- commit/file/conflict/risk 计数和当前 disposition。

Agent 使用 customization map 和路径级 diff 增补语义结论；报告不内嵌无界完整 patch。

## Conflict report

使用 `git merge-tree --write-tree --messages <product-sha> <upstream-sha>`，不修改 index、worktree 或 refs。该命令可能在对象数据库留下不可达 tree objects。

始终分开：

1. Git confirmed conflicts；
2. Automatically mergeable overlaps；
3. Customization contract risks；
4. Dirty worktree overlaps。

始终生成 conflict report。零文本冲突明确写为零，并注明 merge-tree 无法证明编译、运行时、API、数据迁移、权限或业务行为安全。
