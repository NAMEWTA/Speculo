# 创建隔离 worktree

为当前 change 建立独立分支与 `.worktree/<change>/` 工作树。调用方：`dev/01` grill 的 Worktree Setup 阶段（条件）。

## 前置

1. 在 git 仓库内，工作区干净或变更可接受。
2. 目标项目 `.speculo/` 被 git 跟踪——隔离模型要求 change 产物随分支合并回 base。若 `.speculo/` 被 `.gitignore` 忽略，**不隔离**，报告原因并降级。
3. 确保 `.gitignore` 含 `.worktree/`；缺失则提示调用方补上（worktree 工作树不应被 base 分支跟踪）。

## 命名

- base 分支 = 启用隔离时的当前分支（`git rev-parse --abbrev-ref HEAD`）
- change 分支 = `speculo/<cat>/<change>`
- worktree 路径 = `.worktree/<change>`

## 步骤

1. 记录 base 分支名。
2. 确认 change 分支与 worktree 路径均不存在；已存在则停止并报告冲突，不覆盖、不复用。
3. 创建分支与工作树：

   ```bash
   git worktree add -b speculo/<cat>/<change> .worktree/<change>
   ```

4. 在工作树内初始化该 change 的 Speculo 产物目录 `.speculo/<cat>/<change>/` 与 `.status.json`（由调用方按持久化契约写入）。
5. 提示调用方：此后所有工作在 `.worktree/<change>/` 内、`speculo/<cat>/<change>` 分支上进行。

## 返回给调用方

- `base_branch`、`change_branch`、`worktree_path`
- `worktree_status: active`

## 边界

- 不自行选择持久化目录；字段值返回给调用方 workflow 写入 `.speculo/<cat>/<change>/.status.json`。
- 分支或工作树已存在时不覆盖、不复用，停止报告。
- 非 git 仓库 / 工作区不可用 / `.speculo/` 未被跟踪时降级为非 worktree 模式。
