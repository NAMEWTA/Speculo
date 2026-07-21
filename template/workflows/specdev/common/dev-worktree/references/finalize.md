# 收尾合并与清理

实现完成后合并回 base、清理 worktree 与分支。由 SKILL.md 阶段 B 调用。**破坏性操作须先确认。**

## 前置

- 测试通过（未通过不得合并）
- 产物已在 `change_branch` 上提交
- 已有 `base_branch`、`change_branch`、`worktree_path`

## 检测环境

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
WORKTREE_PATH=$(git rev-parse --show-toplevel)
FEATURE_BRANCH=$(git branch --show-current)
```

确定 base 分支：
```bash
BASE=$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null || echo "")
```

## 展示选项

展示前先验测试。**命名分支：**

```
实现已完成。你想怎么做？

1. 本地合并回 <base-branch>（推荐，默认）
2. 推送并创建 Pull Request
3. 保持现状（稍后处理）
4. 丢弃

选哪个？
```

**分离 HEAD：** 移除选项 1，仅提供 2/3/4。用户未指定时默认推荐选项 1。

## 选项 1：本地合并

顺序固定——**先合并验证 → 再删 worktree → 最后删分支**：

```bash
MAIN_ROOT=$(git rev-parse --show-toplevel)
cd "$MAIN_ROOT"

git checkout <base-branch>
git pull   # 仅远程存在且用户未禁止时
git merge --no-ff <change_branch>
```

合并后跑测试。**失败 → 停止，保留现场，报告原因。**

测试通过后：

```bash
# 必须在主仓库根执行，不能在 worktree 内部
git worktree remove {worktree_path}
git worktree prune
git branch -d <change_branch>
```

更新 `.status.json`：`worktree_status: removed`。

报告：已合并到 `<base-branch>`，worktree 与分支已清理。

## 选项 2：PR

推送分支，创建 PR，保留 worktree。若需指定远程或目标分支，先确认。

## 选项 3：保持

不动 worktree 和分支。报告当前状态，以便后续继续。

## 选项 4：丢弃

确认后删除 worktree 和分支（不合并）：

```bash
cd "$MAIN_ROOT"
git worktree remove {worktree_path}
git worktree prune
git branch -D <change_branch>
```

## 失败处理

| 情况 | 处理 |
|------|------|
| 合并冲突 | 停止，报告冲突文件，保留 worktree/分支，不强推 |
| worktree remove 失败 | 停止报告，不 `--force`（用户明确要求除外） |
| 已合并不回滚 | 除非用户明确要求 |

## 清理规则

- **只清理约定路径下的 worktree**（change 目录下 `.worktree/`）
- 路径不匹配 → 不删（可能由 harness 管理）
- 永远在主仓库根执行 `git worktree remove`
- 顺序不可颠倒：merge → remove worktree → delete branch
