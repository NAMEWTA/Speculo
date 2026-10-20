# Repository Contract

## Repository map

`<Path>{roots.state}/commands/upstream-fork-sync/repository-map.json</Path>` 是稳定、项目专属的 Git ref 配置：

```json
{
  "schema_version": 1,
  "repositories": [
    {
      "id": "app",
      "path": ".",
      "product_ref": "refs/heads/main",
      "origin_ref": "refs/remotes/origin/main",
      "origin_remote": "origin",
      "upstream_ref": "refs/remotes/upstream/main",
      "upstream_remote": "upstream",
      "mirror_ref": null,
      "baseline_ref": null,
      "risk_paths": ["src/auth/**", "package.json"]
    }
  ]
}
```

- `id` 使用唯一小写 kebab-case。
- `path` 是项目根 POSIX 相对 Git worktree 路径，`.` 表示项目根；不得绝对、包含 `..` 或指向符号链接目录。
- `product_ref` 与 `upstream_ref` 必填且使用完整 `refs/...`。
- `origin_ref`、`origin_remote`、`mirror_ref`、`baseline_ref` 可以为 `null`；配置 remote 时对应 ref 必须存在。
- `risk_paths` 是项目确认的 glob；它补充稳定 customization map，不取代 Agent 的语义复核。

首次预览允许 schema 相同的内存候选，通过 `assess --dry-run --repository-map-stdin` 输入，不创建上述文件或目录。stdin 与 `--repository-map` 二选一，且仅预览支持 stdin；预览结果记录原始输入的 SHA-256 和 `persisted: false`。缺失或歧义字段返回未完成的配置计划，不推测 refs。普通落盘评估先按 Command 的实际请求保存并回读稳定配置。

## Ref invariants

- Product ref 包含二次开发；mirror 只表示本地上游镜像。
- 配置 baseline 时，它必须同时是 product 与 observed upstream 的祖先；配置 mirror 时，它必须是 observed upstream 的祖先。任一关系不成立时停止评估。
- 普通评估使用 cached refs，不自动 stash、reset、clean、rebase、force-update、删除、commit、merge、push、tag 或更新 submodule pointer。显式 `--fetch` 按 remote 的 refspec 执行 `fetch --prune --tags`，可能更新远端跟踪 refs、tags、FETCH_HEAD 和 Git 对象；必须在运行前按这个真实范围取得并核对刷新授权。
- Dirty worktree 不影响基于 commit 的评估，但必须独立报告。
- `--fetch` 逐仓库刷新配置的 upstream remote，并在配置时刷新 origin remote；失败仓库使用现存 refs 且标记 `stale`，不得称为最新。
- `--dry-run` 与 `--fetch` 互斥；工具在任何刷新或状态写入前拒绝组合。所有只读 Git 调用关闭 optional index locks 和 fsmonitor，合并对象位于项目外临时数据库。存在自定义 merge driver 时不执行它；返回需要另行隔离验证的具体 driver 配置名，不能把缺失检查伪装为 clean。

## Checkpoint discovery

没有有效保存 checkpoint 时：

1. 若配置 baseline，从 baseline 到 product ref 的 first-parent merges 逆序检查；否则检查 product ref 的 first-parent merges。
2. 选择最新一个其非第一父节点属于当前 upstream 历史的 merge。
3. 记录该 upstream 父节点及 merge commit。
4. 没有合格 merge 时，仅在 product/upstream 有唯一 merge-base 时使用它，且 merge commit 为 `null`。

Mirror tip 不能推导已集成 checkpoint；cherry-pick patch equivalence 也不能推进 graph checkpoint。

## Stable customization map

`<Path>{roots.state}/commands/upstream-fork-sync/customization-map.md</Path>` 只保存长期 fork 不变量、领域约束和审查热点。当前 SHAs、fetch 结果、changed files、conflicts、dirty paths 和一次运行结论属于 change 报告。
