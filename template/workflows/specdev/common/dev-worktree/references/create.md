# 创建 Worktree

为当前 workflow change 建立独立 worktree。由 SKILL.md 阶段 A 调用。

## 前置

1. git 仓库内，工作区干净或可接受
2. `speculo/.speculo/` 被 git 跟踪（change 产物随分支合并回 base）；若被忽略则降级非 worktree 模式
3. `.gitignore` 含 `.worktree/`；缺失则追加并提交

## 检测已有隔离

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
SUPER=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
```

| 条件 | 判断 |
|------|------|
| `SUPER` 有值 | submodule，按普通仓库 |
| `GIT_DIR != GIT_COMMON` 且非 submodule | 已在 worktree |
| `GIT_DIR == GIT_COMMON` | 主工作区，继续创建 |

已在 worktree → 报告路径与分支，跳到设置步骤，不重复创建。

## 命名

| 要素 | 值 |
|------|-----|
| base 分支 | `git rev-parse --abbrev-ref HEAD` |
| change 分支 | `speculo/<workflow>/<change>` |
| worktree 路径 | `{state-root}/<workflow>/changes/<change>/.worktree/` |

分支或路径已存在 → 停止报告，不覆盖、不复用。

## 创建

```bash
mkdir -p {state-root}/<workflow>/changes/<change>
git worktree add -b speculo/<workflow>/<change> {state-root}/<workflow>/changes/<change>/.worktree
cd {state-root}/<workflow>/changes/<change>/.worktree
```

> 若平台有原生 worktree 工具（如 `EnterWorktree`）且用户要求使用：用原生工具，但目标路径对齐 change 目录下 `.worktree/` 约定。无法指定路径时注明实际路径，收尾时按真实路径清理。

## 项目设置与基线

```bash
[ -f package.json ] && (npm install 2>/dev/null || true)
[ -f Cargo.toml ] && cargo build
[ -f requirements.txt ] && pip install -r requirements.txt
[ -f go.mod ] && go mod download
# 跑项目基线测试
```

基线失败 → 报告询问，未获许可不开始实现。

## 返回

- `base_branch`、`change_branch`、`worktree_path`（绝对路径）
- `worktree_status: active`
- 由调用方写入 change `.status.json`
