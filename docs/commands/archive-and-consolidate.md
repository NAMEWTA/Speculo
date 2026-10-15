# Archive and Consolidate：选择正确的领域收尾入口

[手册首页](../README.md) · [Command 目录](README.md) · [源入口](../../template/commands/archive-and-consolidate/COMMAND.md)

**业务 ID：** `command/archive-and-consolidate`

## 什么时候用

你知道要归档或整理知识，但不确定该调用哪个领域 Work。这个 Command 负责选择目标、核对授权和汇总回执，实际移动和知识写入由领域 owner 完成。

## 支持哪些对象

| 对象 | 路由 |
|---|---|
| SpecDev 已完成/取消 change，或知识维护主题 | `specdev/archive-and-consolidate` |
| Learning 多主题整合 | `learning/consolidate` |
| Learning 关闭后冷归档 | `learning/archive` |
| OPS、Person、Media | 当前返回 unsupported，不套用通用移动流程 |

```text
明确调用 command/archive-and-consolidate，针对我指定的 SpecDev change 做 dry-run。
先检查完成证据和相关知识/docs，列出具体维护、移动、清理范围与恢复边界。
```

## 如何从预览到执行

先得到固定范围的具体计划。确认该计划后，Command 和 Work 复用同一批准；新增动作或摘要漂移只阻塞受影响部分。纯 dry-run 在会话返回、零文件写入；要求保存计划或获准执行时才保存命令报告。

SpecDev 先维护现役资料再移动；Learning 整合保留原始字节、位置和父子关系。OPS 是资源账本，不能因“归档”删除部署数据或服务器记录。

## 完成怎么看

可能返回 no-candidates、unsupported、dry-run、verified、partial 或 blocked 等真实结果。报告应包含目标、实际动作、验证和部分失败恢复点。直接调用领域 Work 不需要再制造一份 Command 总报告。
