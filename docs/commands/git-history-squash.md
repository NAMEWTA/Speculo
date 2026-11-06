# 整理 Git 历史

AI 入口：`command/git-history-squash` · [权威方法](../../template/commands/git-history-squash/COMMAND.md) · [命令目录](README.md)

将明确提交范围整理成可恢复、内容核验过的完成节点。

## 请求例子

> 把这个 feature 分支从基线 abc123 之后的提交压成一个，保留备份；完成后推送该分支。

## 会得到什么

返回原 tip、新提交、备份引用、最终内容核对和实际远端结果。普通仓库最终 tree 保持一致，子模块 gitlink 的有意变化单独核对。

## 接续与范围

仅预览保持只读；改写和远端更新沿用明确范围的授权。远端使用精确 lease，有漂移就先查明，不无条件强推。

只有需要保存或接续时才更新现有记录；位置与提纯方式见 [流程与持久化](../workflow.md)。
