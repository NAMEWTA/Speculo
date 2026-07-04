# Knowledge Extract Phase

本阶段把 `speculo/.speculo/archive/` 中已完成 change 的高信号产物提取为长期知识候选。归档是证据来源，不是要复制进长期文档的正文仓库。

## 输入

- `LAST_SYNC_SHA..HEAD`
- `speculo/.speculo/archive/`
- `speculo/.speculo/dev/<change>/docs-sync-report.md`
- git diff 中与代码、文档、`.config` 或 archive 相关的路径

## 产物

- `docs-sync-report.md` 的 `Archive Sources` 与 `Knowledge Suggestions` 小节

## 归档扫描

固定先收集：

```bash
RANGE="$LAST_SYNC_SHA..HEAD"
git diff --name-status "$RANGE" -- speculo/.speculo/archive
git diff --name-only "$RANGE" -- speculo/.speculo/archive
find speculo/.speculo/archive -maxdepth 4 -type f | sort
```

若项目没有 `speculo/.speculo/archive/`，记录缺失，不阻塞 docs-sync。

## 读取优先级

只深读相关归档，不批量复制全部历史。优先读取：

- 本次 range 中新增或变更的 archive 文件。
- 文件名为 `decision-log.md`、`domain-model-log.md`、`prd*.md`、`issues-slices.md`、`review-report.md`、`completion-summary.md`、`retro*.md`、`report.md` 的高信号产物。
- 与本次 diff 触及路径、术语、模块或 ADR 编号同名/同义的归档 change。

低信号产物（日志、快照、纯执行记录）只记录路径，不提取长期知识。

## 提取映射

| 归档信号 | 映射目标 |
|----------|----------|
| 已确认、难以逆转、有权衡的 `D-*` 决策 | ADR 候选或现有 ADR 更新 |
| 新术语、术语冲突、上下文边界变化 | CONTEXT 候选；不稳定时转 `../M-domain-modeling/M-domain-modeling.md` |
| 反复出现的约束、禁止项 | RULES 建议（propose-only） |
| 可复用踩坑、验证经验、工作流反模式 | LESSONS 新增/合并/删除候选 |
| 与当前实现不一致的旧说明 | tracked assets 或 `.config` 更新/删除候选 |
| 被取代、合并、放弃的方案 | ADR supersession 或 prune 候选 |

## 不确定性处理

以下情况不得直接写入 `.config`：

- 同一术语存在多种含义。
- 决策是否仍有效无法从代码或归档判断。
- 归档记录与当前代码相互矛盾。
- 候选规则会改变用户维护的 `RULES.md`。

处理方式：在 report 中列为 `propose-only`，并调用 `../M-domain-modeling/M-domain-modeling.md` 或等待用户确认。

## 完成准则

- 已列出读取过的 archive 路径。
- 每个知识候选都有来源路径和生命周期动作。
- 无证据或低信号内容未写入长期资产。
- 不确定项已标记为待确认或移交领域建模。
