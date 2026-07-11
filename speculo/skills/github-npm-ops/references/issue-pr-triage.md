# Issue 与 PR 分诊手册

标签体系、分诊节奏、社区 PR 质量线与 stale 策略的落地细节。SKILL.md 中保留的是每天会用的动作，这里覆盖边界与模板。

## 标签体系

建议仓库标签按维度分组，而不是一股脑堆平。

### 类型标签（必须有一个）

| 标签               | 含义                                    |
| ------------------ | --------------------------------------- |
| `bug`              | 功能不符合预期或文档                    |
| `feature-request`  | 新功能请求                              |
| `enhancement`      | 现有功能的改进                          |
| `documentation`    | 文档相关                                |
| `question`         | 使用类问题（非 bug）                    |
| `duplicate`        | 与其他 issue/PR 重复                    |
| `invalid`          | 不适用本项目                            |
| `wontfix`          | 不会修（给清晰理由）                    |
| `good-first-issue` | 适合新贡献者                            |

### 优先级（可选，用于 bug/feature-request）

| 标签                | 含义                                             |
| ------------------- | ------------------------------------------------ |
| `priority:critical` | 生产破坏、安全事件；24h 内响应                   |
| `priority:high`     | 显著影响主要用户；1 周内处理                     |
| `priority:medium`   | 影响部分用户或体验；按 sprint 排期                |
| `priority:low`      | 外观/轻微改进；有空再说                          |

### 模块/领域（自定义）

根据项目结构给领域标签，例如 `area:cli`、`area:templates`、`area:skill-creator`。方便按模块聚合。

### 状态标签

| 标签                | 含义                                        |
| ------------------- | ------------------------------------------- |
| `needs-repro`       | 等复现步骤                                  |
| `needs-design`      | 需要设计讨论再 coding                       |
| `needs-review`      | PR 等评审                                   |
| `blocked`           | 被其他 issue/上游依赖阻塞                   |
| `stale`             | 长时间无活动                                |
| `closed-stale`      | 因无活动被关闭                              |

## Issue 分诊流程

1. 读 title、body、comments，判断类型
2. 搜重复：`gh issue list --search "关键词" --state all --limit 20`
3. 打 **类型** 标签，必要时加 **优先级** 和 **领域**
4. 根据缺失信息回复：
   - bug 缺复现：问复现步骤、系统信息、复现率
   - feature-request：问具体 use case，是否有 workaround
   - question：直接回答或指向文档

### 回复模板

**要求复现**

> Thanks for the report. Could you share a minimal reproduction? Please include:
> - Command you ran and full output
> - Node version (`node -v`) and OS
> - Contents of relevant config files
> Without this we can't investigate further.

**标记重复**

> This looks like a duplicate of #XXX. Closing here, please follow the original for updates. Thanks!

**转为 discussion**

> This is more of a usage question than a bug, moving to Discussions where the community can chime in.

### 大批量分诊节奏

每天或每两天扫一次 open issue：

```bash
# 没有 type 标签的都要处理
gh issue list --state open \
  --search "no:label" \
  --limit 50
```

## PR 审查流程

### 入场检查（收到 PR 后 24h 内）

1. CI 是否全绿：`gh pr checks <N>`
2. 是否可合并：`gh pr view <N> --json mergeable,mergeStateStatus`
3. 是否有描述、是否关联 issue
4. 是否来自新贡献者（给欢迎评论）

### 评审维度（深度审查时）

- **目的对齐**：PR 是否解决了声明的 issue
- **实现**：是否符合项目约定（见 AGENTS.md / CONTRIBUTING.md）
- **测试**：新功能/bug 修复是否带测试
- **文档**：面向用户的变更是否更新了 README/docs
- **兼容性**：是否有破坏性变更，是否在 PR 描述里标注

### 合并决策

CI 全绿 + 至少一位 maintainer approve + 无 `blocked`/`needs-design` 标签 → 可合并。

```bash
# Squash merge（默认策略）
gh pr merge <N> --squash --delete-branch

# Merge commit（保留完整历史）
gh pr merge <N> --merge --delete-branch
```

## Stale 策略

### 判断规则

- **Issue**：14 天无活动 → 加 `stale` 并询问
- **PR**：7 天无 review/comment → 主动询问是否继续
- **Stale → Closed**：再 14 天无响应 → 关闭并加 `closed-stale`

### 自动化（推荐）

用 [`actions/stale`](https://github.com/actions/stale)：

```yaml
name: Mark Stale

on:
  schedule:
    - cron: '30 1 * * *'

jobs:
  stale:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      pull-requests: write
    steps:
      - uses: actions/stale@v9
        with:
          days-before-issue-stale: 14
          days-before-issue-close: 14
          days-before-pr-stale: 7
          days-before-pr-close: 14
          stale-issue-label: 'stale'
          stale-pr-label: 'stale'
          close-issue-label: 'closed-stale'
          close-pr-label: 'closed-stale'
          stale-issue-message: >
            此 issue 已 14 天无更新。如仍需关注请留言，否则 14 天后将自动关闭。
          stale-pr-message: >
            此 PR 已 7 天无更新。如仍在推进请留言，否则 14 天后将自动关闭。
          exempt-issue-labels: 'pinned,priority:critical,priority:high'
          exempt-pr-labels: 'pinned,work-in-progress'
```

### 手动查询

```bash
# 找超过 14 天未更新的 open issue
gh issue list --state open \
  --json number,title,updatedAt \
  --jq '.[] | select(.updatedAt < "2026-04-26")' | head -20

# 找超过 7 天未更新的 open PR
gh pr list --state open \
  --json number,title,updatedAt,author \
  --jq '.[] | select(.updatedAt < "2026-05-03")'
```

## 社区 PR 特殊处理

### 新贡献者检测

看 PR 作者历史：

```bash
gh pr view <N> --json author,authorAssociation
# authorAssociation: FIRST_TIME_CONTRIBUTOR / CONTRIBUTOR / MEMBER
```

首次贡献者给热情的欢迎评论，附：

- CONTRIBUTING 链接
- 本地跑测试的命令
- 告知 review 时长预期

### CLA / DCO

若仓库要求 CLA 签署或 DCO signoff，PR 里会有 bot 检查。未签署的：

> Thanks for the PR. Our CLA bot needs you to sign the agreement before we can merge. You should see a comment above with instructions.

### 驳回时保持尊重

即使方向不对也要说明清楚：

> Thanks for taking the time on this. After discussing with the team, we've decided not to go this direction because [原因]. The alternative we're considering is [方案]. Closing this PR, but would love to hear your thoughts in [issue link].

## 每周例行巡检

一个典型的周一清单：

```bash
# 1. 未分诊的 issue
gh issue list --state open --search "no:label" --limit 20

# 2. 超过 7 天无 review 的 PR
gh pr list --state open --json number,title,updatedAt \
  --jq '.[] | select(.updatedAt < "YYYY-MM-DD")'

# 3. 本周合并统计
gh pr list --state merged --base main --search "merged:>YYYY-MM-DD"

# 4. 关注 critical/high 标签的未解决 issue
gh issue list --label "priority:critical,priority:high" --state open
```
