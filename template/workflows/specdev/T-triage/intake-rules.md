# 摄入规则

将外部 issue 或 PR 规范化为会话内统一结构，供后续理解与落盘使用。本步骤只读取远端或用户输入，不写回 tracker。

## 远程可用性

按顺序探测：

1. 当前目录处于 git 仓库内
2. `gh` 可执行
3. `gh auth status` 成功

三者皆满足 → **远程可用**。任一项失败 → 按粘贴 / 口头路径处理，向用户说明原因。

## 远程拉取

用户给出 `#N`、纯数字编号、issue URL 或 PR URL 时：

**Issue（优先）**

```bash
gh issue view <n> --json number,title,body,author,labels,url,createdAt,state,comments
```

人类可读备选：`gh issue view <n> --comments`。

**PR（用户明确给了 PR，或 issue view 失败且 `gh pr view <n>` 成功）**

```bash
gh pr view <n> --json number,title,body,author,labels,url,createdAt,state,comments,files
```

PR 按「附带代码的 issue」处理：正文 + 评论 + 变更文件列表进入内部结构；diff 摘要可记入 `body` 附录或 comments 旁注。仍只写本地产物。

**解析 `#N`**：先尝试 `gh pr view N`，再 `gh issue view N`（或按用户声明的类型二选一）。

**失败回退**：网络错误、无权限、编号不存在 → 向用户说明，并请粘贴标题 + 正文 + 关键评论。不中止分诊。

## 粘贴与口头

| 来源 | 条件 | 处理 |
|------|------|------|
| `paste` | 用户粘贴全文（可含评论） | 拆出标题、正文、评论块；缺评论则 `comments: []` |
| `manual` | 仅口头 / 碎片描述 | 索取最小字段：标题、问题描述、期望行为；可选复现步骤 |

## 规范化内部结构

无论来源，统一为：

| 字段 | 说明 |
|------|------|
| `source` | `gh` \| `paste` \| `manual` |
| `kind` | `issue` \| `pr` \| `manual` |
| `number` | 编号，无则 `n/a` |
| `title` | 标题 |
| `body` | 正文（markdown 原文） |
| `url` | 远端 URL，无则空 |
| `author` | 作者登录名或「用户」 |
| `labels` | 标签字符串数组 |
| `state` | open/closed 等，未知则空 |
| `comments` | `{ author, created_at, body }[]` |
| `fetched_at` | ISO-8601 摄入时间 |

后续步骤只消费此结构；写入 `source-issue.md` 时按 `<Path>{roots.workflows}/specdev/T-triage/artifact-templates.md</Path>` 展开。

## 完成检查

- 标题非空
- 正文非空（`manual` 时问题描述 + 期望行为可拼成 body）
- `source` 与 `fetched_at` 已设
- 远程路径下 `number` 与 `url` 尽量齐全；失败回退已标注
