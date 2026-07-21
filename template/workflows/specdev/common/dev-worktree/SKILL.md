---
name: dev-worktree
description: 在 Speculo workflow change 内创建隔离 git worktree 进行开发，完成后验证测试并合回基础分支。当用户要求隔离开发、开始实现、或实现完成后需要合并/清理时使用。与 specdev workflow 深度集成，worktree 持久化在 change 目录下的 .worktree/ 中。
---

# Dev Worktree

为当前 workflow change 创建独立 worktree，实现「隔离开发 → 验证 → 合并 → 清理」闭环。

**启动时宣布：** 「正在使用 dev-worktree 技能。」

## 决策树

| 场景 | 入口 |
|------|------|
| 要开始实现 / 用户要求隔离 | **阶段 A：创建 worktree** |
| 已在 worktree 中，开发完成 | **阶段 B：收尾合并** |
| 已在 worktree 中，未完成 | 继续开发，不重复创建 |
| 用户要求 PR / 暂存 / 丢弃 | 阶段 B 按对应选项执行 |

---

## 阶段 A：创建 Worktree

详细步骤见 [references/create.md](references/create.md)。核心流程：

### A0. 检测现有隔离

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
SUPER=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
```

- `SUPER` 有值 → submodule 内，按普通仓库处理，不误判
- `GIT_DIR != GIT_COMMON` 且非 submodule → 已在 worktree，跳到 A3 设置
- `GIT_DIR == GIT_COMMON` → 主工作区，继续

### A1. 命名与路径

| 要素 | 值 |
|------|-----|
| 基础分支 | 当前分支（`git rev-parse --abbrev-ref HEAD`） |
| change 分支 | `speculo/<workflow>/<change>` |
| worktree 路径 | `{state-root}/<workflow>/changes/<change>/.worktree/` |

分支或路径已存在 → 停止，不覆盖不复用。

**前置检查：** `speculo/.speculo/` 必须被 git 跟踪——产物需随分支合并。若被忽略则降级为非 worktree 模式。

### A2. 创建

```bash
git worktree add -b speculo/<workflow>/<change> {state-root}/<workflow>/changes/<change>/.worktree
```

确保 `.gitignore` 含 `.worktree/`；缺失则追加并提交。

### A3. 项目设置与基线

自动检测并安装依赖、运行基线测试：

```bash
[ -f package.json ] && (npm install 2>/dev/null || true)
[ -f Cargo.toml ] && cargo build
[ -f requirements.txt ] && pip install -r requirements.txt
[ -f go.mod ] && go mod download
# 跑基线测试
```

基线测试失败 → 报告并询问，未获许可不开始实现。

### A4. 写回状态

将 `base_branch`、`change_branch`、`worktree_path`、`worktree_status: active` 写入 change 的 `.status.json`。

---

## 阶段 B：收尾合并

详细步骤见 [references/finalize.md](references/finalize.md)。

### B1. 验证测试

跑项目测试套件。失败 → 停止，禁止合并/PR。

### B2. 展示选项

```
实现已完成。你想怎么做？

1. 本地合并回 <base-branch>（推荐，默认）
2. 推送并创建 Pull Request
3. 保持现状（稍后处理）
4. 丢弃

选哪个？
```

分离 HEAD 时移除选项 1。用户未指定时默认选项 1。

### B3. 执行 —— 顺序不可变

**选项 1（本地合并）：**
1. 合并到 base：`git checkout <base> && git pull && git merge --no-ff <change_branch>`
2. 在合并结果上再跑测试
3. 测试通过 → 从主仓库根删除 worktree：`git worktree remove <path>`
4. 删除分支：`git branch -d <change_branch>`
5. `git worktree prune`
6. 更新 `.status.json`：`worktree_status: removed`

**选项 2（PR）：** 推送分支、创建 PR，保留 worktree。
**选项 3（保持）：** 不动，报告状态。
**选项 4（丢弃）：** 确认后删除 worktree 和分支。

合并冲突或测试失败 → 停止，保留现场，报告原因，不强推。

---

## 红线

**绝不：**
- 已在 worktree 时嵌套创建
- 覆盖已有分支或路径
- 测试失败时继续合并/PR
- 合并结果未验证就删 worktree
- 先删分支再 worktree remove（顺序：merge → remove worktree → delete branch）
- 在 worktree 内部执行 `git worktree remove`
- 未经确认执行破坏性操作
- 强制推送

**始终：**
- 分支名：`speculo/<workflow>/<change>`
- worktree 路径：change 目录下的 `.worktree/`
- 创建后装依赖 + 基线测试
- 收尾前验证测试
- 合并成功后再清理
- 清理后 `git worktree prune`
