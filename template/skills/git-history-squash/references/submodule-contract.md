# Submodule Contract

## Dependency graph

每个 child repository 用 `submodule_of` 声明直接父级：

```json
{
  "repository": "workspace",
  "gitlink_path": "services/backend"
}
```

- Parent id 必须属于同一 request；图必须无环。
- Child `path` 必须解析为 parent path 下 `gitlink_path` 的真实 repository。
- Parent end tree 在该路径必须是 mode `160000`，old gitlink 必须等于 child old end。
- Parent `.gitmodules` 必须唯一声明该 path；嵌套 submodule 逐层处理。
- 有 parent 的 child 必须配置 `remote.publish: true`；父级 local ref 只能在 child new SHA 已从声明的远端 branch 回读后推进。

## Planned parent tree

父仓库的 old/new tree 不可能完全相等，因为 child squash 会改变 commit SHA。父级验证目标定义为：

```text
planned parent tree = parent old end tree
                      + 每个直接 child gitlink old SHA -> child published new SHA
```

脚本使用临时 `GIT_INDEX_FILE` 读取 parent old end tree，只对已声明 mode `160000` 路径执行 cacheinfo 替换，再 `write-tree`。临时 index 不得指向真实 repository index。

父级新 tree 与 old tree 的差异必须精确等于声明的 gitlink 路径；路径 mode 必须保持 `160000`，new object id 必须等于已发布 child SHA。普通文件、目录、symlink 或未声明 gitlink 有任何差异都停止。

## Execution order

1. 叶子 repository 生成 dry-run manifest并取得本地确认；
2. 叶子完成 local transaction 和 tree 验证；
3. 叶子生成 remote manifest并取得远端确认；
4. 叶子远端 branch 回读精确等于 new SHA；
5. 父级使用这些已发布 SHA 生成新的本地 manifest，再次取得确认；
6. 父级创建 planned tree/new commit、推进 local ref并验证；
7. 从叶到根重复，最上层最后发布。

用户拒绝或延迟某层远端确认时，已完成 child 保持 `local-verified`，parent 保持 `planned`。后续调用从 state 恢复，但重新读取所有 refs/remotes 并重新取得当前层授权。

## Checked-out aggregate worktree

父目标 branch 未在任何 worktree checkout 时，只更新 branch ref。父目标 branch 已 checkout 时：

- 预检要求 parent 和直接 child worktree 均 clean；
- child checkout 为目标 branch 时必须已随 branch ref 到达 new SHA；为 detached HEAD 时只能从精确 old SHA CAS 到 child new SHA；其他状态阻塞；
- 父真实 index 只更新声明的 gitlink cache entries，使其与 planned tree 一致；
- 完成后父与 child worktree 必须 clean。

Index、detached HEAD 或 branch ref 任一步失败时停止并保留 backup ref；跨 repository/index 操作不宣称原子，报告列出现场与恢复顺序。
