# Phase 0 — 前置检测完整清单

> 本文件是 `npm-cicd-release` 命令 Phase 0 的「展开形态」。命令正文只列出五项核心前置；这里给出 11 项完整探测、失败信号与建议修复。
> 全部探测都是**只读**的，不会修改任何文件。任一项不通过 → 命令终止，输出修复建议；不要尝试自动跳过。

## 探测矩阵

| # | 项 | 探测命令 | 通过判定 | 失败建议 |
|---|----|---------|---------|---------|
| 1 | 当前分支 | `git rev-parse --abbrev-ref HEAD` | 输出 = 仓库声明的发布分支（默认 `main`） | `git checkout main` 后重新触发；或显式声明本仓库的发布分支 |
| 2 | 工作区干净 | `git status --porcelain` | 输出为空 | 先 stash / commit；不允许 `git stash` 后立刻发版（stash 内容易丢失） |
| 3 | 远端可达 | `git ls-remote --exit-code origin` | 退出码 0 | 检查网络 / SSH key / `gh auth status` |
| 4 | gh 已登录 | `gh auth status` | 含 `Logged in to github.com` | `gh auth login` |
| 5 | gh 仓库权限 | `gh repo view --json viewerCanAdminister` | `viewerCanAdminister == true` 或至少 push 权限 | 联系仓库管理员；或 fork 后申请 PR 流程 |
| 6 | Node 版本 | `node --version` | ≥ `package.json#engines.node` | `nvm use` / `fnm use` / 升级本机 Node |
| 7 | 包管理器 | `pnpm --version` (或 `npm` / `yarn`) | 版本 ≥ 仓库 lockfile 隐含版本 | 安装匹配版本；不要随意切换包管理器 |
| 8 | release.yml 存在 | `test -f .github/workflows/release.yml` | 文件存在 | 转 `github-npm-ops` skill 的 `references/workflow-yaml-reference.md` 先落该文件 |
| 9 | release.yml 形态 | 见 [publish-detection.md](publish-detection.md) | 输出 `PUBLISH_TO_NPM=true` 或 `false` | 见 publish-detection 文档的判定矩阵 |
| 10 | docs-sync state | `test -f speculo/.speculo/dev/docs-sync-state.json && jq . speculo/.speculo/dev/docs-sync-state.json` | 解析成功且 `last_sync_sha != null` | 不存在 → 走 `dev/D-docs-sync` workflow 的「首次运行」分支；存在但损坏 → 修复 JSON |
| 11 | tag 名称冲突 | `git rev-parse vX.Y.Z 2>/dev/null` | 退出码非 0（tag 不存在） | 同 tag 已存在：先确认是否真的失败需要重发；若是则 `git tag -d` + `git push origin :refs/tags/vX.Y.Z`，否则 bump 到下一版本 |

## 失败处理总策略

- 探测项 1–3、6–7：本机环境问题，提示用户人工修复后重跑命令
- 探测项 4–5：GitHub 权限问题，给出对应的 `gh` 命令
- 探测项 8：基础设施缺失，明确转交 `github-npm-ops` skill 而不是在本命令里现写 release.yml
- 探测项 9：影响 Phase 5 的分支选择，**不阻塞**命令执行（仅决定后续是否做 npm view 校验）
- 探测项 10：影响 Phase 2 是否进入 docs-sync 主流程
- 探测项 11：直接关系到能否打 tag，必须在 Phase 0 阶段就排除

## 与三个 skill 的边界

Phase 0 只做**只读探测**，不调用任何 skill 的 SOP：

- `git-commit-template` skill 只在 Phase 1 被引用
- `docs-sync` skill 只在 Phase 2 / Phase 6 被引用
- `github-npm-ops` skill 在 Phase 3 / 4 / 5 被引用

如果 Phase 0 嗅探到的状态需要某个 skill 的修复 SOP（如 release.yml 缺失），明确转交，不要在本命令内复刻 skill 的内容。
