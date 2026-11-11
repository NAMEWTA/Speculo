# 审计 Git 仓库

AI 入口：`command/git-repository-audit` · [权威方法](../../template/commands/git-repository-audit/COMMAND.md) · [命令目录](README.md)

从固定提交和实际 diff 理解历史变化、热点和风险。

## 请求例子

> 审计 main 最近两个月的功能演进，给出关键提交和最值得继续检查的模块。

## 会得到什么

报告范围、证据、指标口径、主要判断和限制。提交数量或改动行数不单独代表开发质量。

## 接续与范围

默认只读本地仓库，不自动 fetch、修改分支或创建 issue；需要最新远端时应在请求中说明。

只有需要保存或接续时才更新现有记录；位置与提纯方式见 [流程与持久化](../workflow.md)。
