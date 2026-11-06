# 显式命令

这些命令由 AI 读取执行，不是终端 `speculo` 子命令。宿主曝光 ID 使用 `command/<名称>`；同一任务的既有范围与授权继续有效。

| 命令 | 用途 |
| --- | --- |
| [status](status.md) | 看当前成果、阻塞和下一步，不自动执行后续工作。 |
| [handoff](handoff.md) | 把接手者真正需要的上下文更新到现有记录。 |
| [project-maintenance](project-maintenance.md) | 核对当前文档、提纯知识并整理已结束记录。 |
| [git-repository-audit](git-repository-audit.md) | 从固定提交和实际 diff 理解历史变化、热点和风险。 |
| [git-history-squash](git-history-squash.md) | 将明确提交范围整理成可恢复、内容核验过的完成节点。 |
| [upstream-assess](upstream-assess.md) | 比较 fork 与一个明确上游版本，保护本项目定制。 |
| [source-code-zip](source-code-zip.md) | 按阅读或复建用途生成范围明确的 ZIP。 |
| [speculo-feedback](speculo-feedback.md) | 把真实失败提炼为可复现、可验收的提案。 |

## 安装与调用

```bash
speculo init . --skill-targets agents --skills command/status,command/handoff
```

命令不要求额外安装某个领域才能被发现；具体工作需要领域方法时，读取已安装的对应 Work，缺少时明确说明。只想查看安装状态使用 `speculo doctor`，不是 `command/status`。

八个命令保留独立用途。`coordination-init` 已随编排协议退出；目标规划与切片通过 SpecDev Work 使用，当前宿主负责实际协作。
