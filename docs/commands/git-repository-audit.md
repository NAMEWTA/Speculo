# Git Repository Audit：只读盘点本地仓库历史

[手册首页](../README.md) · [Command 目录](README.md) · [源入口](../../template/commands/git-repository-audit/COMMAND.md)

**业务 ID：** `command/git-repository-audit`

## 什么时候用

想了解一个或多个仓库某段时间的变更、热点、修复和协作情况，得到可复现证据。它分析本地已有 Git 历史，不调用外部 API，不 fetch 补齐数据。

## 准备什么

明确项目根、仓库集合、时间区间、refs、作者名字和路径筛选。统计范围会影响结论，不应先扩大分析再让你被动接受。

```text
明确调用 command/git-repository-audit，只审计当前仓库 main 的指定时间区间。
关注模块热点、修复与提交节奏，给出原始指标、证据和复核命令，交付一个完整 Markdown 报告。
```

时间区间请补上实际起止日期。对“贡献”的解释应考虑合并方式、生成代码、身份和范围限制，不能用代码增删量替代业务价值。

## 环境与输出

Python 采集计算固定使用 `uv run --no-project python -` 和标准库；`uv` 不可用时停止，不改用其他环境管理方式，也不修改项目虚拟环境。

唯一持久化产物是 `roots.state/commands/git-repository-audit/` 下的 Markdown 报告，包含选择、固定 Git 快照、指标、证据、结论、限制和复核命令。不另建 CSV、JSON、数据库或长期缓存。

## 完成怎么看

采集可复现、交叉核对通过，报告已保存并回读。它不会更改代码、index、refs、远端或 Git 配置。没有可靠数据的部分明确未知；需要刷新远端数据应另行明确处理后再评估。
