# 版本 bump → release commit → tag → push 端到端 SOP

把"想发个新版本"翻译成可复现的几条命令。本文档假设仓库已有 `release.yml`(`v*` tag 触发,含 release-notes 注入)。

## 0. 前置检查

```bash
# 1. main 干净,没有未提交改动
git status

# 2. 当前 HEAD 与 origin/main 的关系
git log origin/main..HEAD --oneline

# 3. 上一次发布的 tag
git tag --sort=-version:refname | head -3

# 4. CHANGELOG 顶部 [Unreleased] 段落已写好本次内容
head -30 CHANGELOGS.md
```

任意一项异常先解决再发版:工作区不干净 → 先提交或暂存;`[Unreleased]` 为空 → 先做 docs-sync。

## 1. 维护 CHANGELOG

`CHANGELOGS.md` 顶部必须始终保留 `[Unreleased]` 段落。新版本发布时:

1. 把 `[Unreleased]` 内容**整段迁移**到新建的 `## [X.Y.Z] — YYYY-MM-DD` 标题下
2. 重新插入空的 `[Unreleased]` 段落
3. 在文件末尾的"版本链接"段更新 compare 链接

```diff
 ## [Unreleased]
+
+---
+
+## [0.0.10] — 2026-05-17

 ### Changed
 - ...
```

```diff
-- [Unreleased](https://github.com/owner/repo/compare/v0.0.9...HEAD)
+- [Unreleased](https://github.com/owner/repo/compare/v0.0.10...HEAD)
+- [0.0.10](https://github.com/owner/repo/releases/tag/v0.0.10)
 - [0.0.9](https://github.com/owner/repo/releases/tag/v0.0.9)
```

完整 CHANGELOG 契约见 [docs-sync skill](../../docs-sync/SKILL.md) 或 docs-sync 的 changelog-contract.md。

## 2. bump package.json

**用 `npm version` 还是手改?**

| 场景 | 推荐 |
|------|------|
| 单一 package.json,简单 bump | `npm version <major\|minor\|patch> --no-git-tag-version` |
| Monorepo / 多文件版本号要同步 | 手改 + `pnpm -r`(或脚本) |
| 已写好 CHANGELOG,只想改 package.json 一处 | 手改 |

`--no-git-tag-version` 的关键作用:**只改文件,不自动打 tag**。我们要把 tag 打在 release commit 上,不是在 bump 这一刻。

```bash
# 等价于手改 package.json 的 version 字段
npm version 0.0.10 --no-git-tag-version
```

## 3. release commit(原子提交)

把 `package.json` + `CHANGELOGS.md` 一并提交,使用 Conventional Commits 的 `chore(release):` 前缀。

```bash
git add package.json CHANGELOGS.md
git commit -m "chore(release): v0.0.10" \
           -m "迁移 [Unreleased] 段落到 0.0.10:<一两句关键变更摘要>"
```

**为什么必须是同一个 commit**:
- tag 要精确指向这个 commit
- workflow 的 `Verify tag matches package version` 步骤会校验该 commit 上的 `package.json` 版本与 tag 一致
- 利于后续 `git revert` 一键回滚发布

## 4. push main

```bash
git push origin main
```

push **必须先于** tag,否则远端 tag 会指向 origin 看不到的 commit,GitHub Release 创建时会找不到对应 commit 树。

## 5. 打 tag 并精确指向 release commit

```bash
# 显式指定 commit SHA,避免 HEAD 已经向前移动
RELEASE_COMMIT=$(git log -1 --format=%H --grep="^chore(release): v0.0.10")

git tag v0.0.10 "$RELEASE_COMMIT"
git push origin v0.0.10
```

**为什么要指定 SHA 而不是直接 `git tag v0.0.10`**:

如果 release commit 之后又做了几笔 docs / state 推进 commit,`HEAD` 不再是 release commit。直接 `git tag` 会把 tag 打在 docs commit 上,导致:

- `Verify tag matches package version` 仍然通过(版本号对得上)
- 但 `gh release view --json targetCommitish` 指向 docs commit
- 长远看 release tag 与"真正的发布动作"脱钩

简单场景下(release commit 就是 HEAD)直接 `git tag v0.0.10` 也对,但养成显式 SHA 的习惯更稳。

## 6. 监控 workflow

```bash
# 实时跟踪
gh run watch

# 或周期性查询
gh run list --workflow release.yml --limit 3 \
  --json databaseId,status,conclusion,displayTitle,headBranch
```

预期顺序(11 步,缺一不可):

1. Set up job
2. Checkout
3. Setup environment
4. **Verify tag matches package version**
5. Run lint
6. Run tests
7. Build
8. **Verify bin entry**
9. **Extract release notes from CHANGELOGS.md** ← v1.1.0 新增
10. **Publish to npm**
11. **Create GitHub Release**

## 7. 三端验证

```bash
# 1. npm 包已上线(CDN 30–60 秒延迟)
npm view @scope/pkg version
npm view @scope/pkg dist-tags

# 2. GitHub Release 存在 + 正文非空
gh release view v0.0.10 --json name,tagName,isDraft,isPrerelease,body \
  --jq '{name, tagName, isDraft, isPrerelease, body_length: (.body | length), body_preview: (.body | .[0:200])}'

# 3. workflow conclusion=success 且所有步骤 success
gh run view <run-id> --json conclusion,jobs \
  --jq '{conclusion, steps: [.jobs[].steps[] | {name, conclusion}]}'
```

任一缺失视为发布残次品:

| 缺失项 | 修复 |
|--------|------|
| npm 包查不到 | 等 60 秒再查;仍无 → 看 workflow `Publish to npm` 步骤日志 |
| Release 正文为空 / 仅一行 Full Changelog | 跑 [release-notes-injection.md](release-notes-injection.md) §3 的事后修复 |
| workflow `Extract release notes` 失败 | CHANGELOG 标题与 tag 不匹配,核对 `## [X.Y.Z]` 是否存在 |

## 8. 失败回滚

### 8.1 publish 前任意步骤失败

最干净:删 tag 重打。

```bash
git tag -d v0.0.10
git push origin :refs/tags/v0.0.10

# 修问题 → 重新 commit(若 release commit 也要改,用 amend)
git commit --amend
git push origin main --force-with-lease    # 仅当 amend 了已 push 的 commit 时

# 重新打
git tag v0.0.10 <commit-sha>
git push origin v0.0.10
```

### 8.2 publish 已成功但后续步骤失败

npm 已上线 → **不要**改版本号,只补后续动作。

```bash
# 抽取 CHANGELOG 段落
awk -v v="0.0.10" '...' CHANGELOGS.md > /tmp/notes.md

# 手动创建 GitHub Release
gh release create v0.0.10 --notes-file /tmp/notes.md --latest

# 或编辑已有 Release(如果 action 半成品创建过空 Release)
gh release edit v0.0.10 --notes-file /tmp/notes.md
```

### 8.3 publish 失败但 npm 上其实有了(罕见)

```bash
# 确认状态
npm view @scope/pkg@0.0.10 version

# 如果有,说明上传完但 npm 返回失败码,直接当作 8.2 处理(已发,只补 Release)
# 如果无,按 8.1 处理(重打 tag)
```

### 8.4 npm 不允许重发同一 version

铁律:即使 `npm unpublish` 过,**24h 内同一版本号也不能再发**。若 publish 真上传成功但需要修代码:

```bash
# bump 到下一个补丁
npm version 0.0.11 --no-git-tag-version
git add package.json CHANGELOGS.md
git commit -m "chore(release): v0.0.11"
git push origin main
git tag v0.0.11
git push origin v0.0.11
```

## 9. CHECKLIST

发版前过一遍:

- [ ] `git status` 干净
- [ ] CHANGELOG 顶部已迁移 `[Unreleased]` 到新版本段
- [ ] 底部 compare 链接已更新
- [ ] `package.json` version 与即将打的 tag 严格一致(去掉 `v` 前缀)
- [ ] `pnpm check` 本地通过(lint + test + build)
- [ ] `pnpm build:check-bin` 通过(若是 CLI 包)
- [ ] release commit 已 push 到 origin/main
- [ ] tag 指向 release commit(不是 docs commit / HEAD 漂移后的 commit)
- [ ] tag 已 push,`gh run list` 看到 workflow 触发
- [ ] workflow 11 步全 success
- [ ] 三端验证齐全:npm 有 / Release body 非空 / workflow success
