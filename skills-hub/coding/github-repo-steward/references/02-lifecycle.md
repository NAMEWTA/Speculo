# 归档与删除

官方文档：

- 归档：https://docs.github.com/en/repositories/archiving-a-github-repository/archiving-repositories
- 删除：https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository
- 恢复已删仓：https://docs.github.com/en/repositories/creating-and-managing-repositories/restoring-a-deleted-repository

## 归档

效果：仓库变只读。Issues、PR、代码、wiki、release、权限都冻结。他人仍可 fork、star、搜索。协作者不能再被添加或移除。

```bash
gh repo archive OWNER/REPO --yes
# 等价
gh api -X PATCH repos/OWNER/REPO -F archived=true --jq '{name,archived}'
```

取消归档：

```bash
gh api -X PATCH repos/OWNER/REPO -F archived=false --jq '{name,archived}'
```

网页：`https://github.com/OWNER/REPO/settings` → Danger Zone → Archive。

适合：自己的原创仓、还有 star/历史价值、暂时不维护。不适合：确定要灭迹的实验 fork（走删除）。

## 删除

```bash
gh repo delete OWNER/REPO --yes
```

网页：Settings → Danger Zone → Delete this repository，输入仓名确认。

后果：

- 公有仓的 fork **不会**随删除消失。
- 私有仓的 fork **会**一起删。
- 团队权限永久丢掉。
- 部分仓库可在删除后 90 天内恢复；非空 fork 网络等情况存在限制，GitHub Support 恢复支持还受付费计划条件限制。不能承诺一定可恢复。
- 同名 `OWNER/REPO` 可能被保留一段时间不能新建；若删前一周 Actions 用量或 clone 很高，名称组合可能被永久退役。

复核：先确认本次删除返回成功，再以同一账号读取应为 404；单独的 404 也可能表示不可见，不能作为删除成功的唯一证据。

适合：已被新仓替代的旧 fork、空仓、明确废弃的镜像。有 star 的原创仓默认归档。

## 选择

| 情况 | 动作 |
|---|---|
| 原创、有 star 或有文档价值、不再开发 | 归档 |
| 上游已迁走的 fork / 配套 docs | 删除 |
| 空仓、错 fork、一次性实验 | 删除 |
| 还在用 | 不动 |
| 不确定 | 只列入 hygiene 建议，等用户点名 |
