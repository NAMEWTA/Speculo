---
name: resolving-merge-conflicts
description: "用于解决进行中的 git merge/rebase 冲突。"
---

1. **查看 merge/rebase 的当前状态**。检查 git 历史记录和冲突文件。

2. **查找每个冲突的一手来源**。深入理解每个更改的原因以及原始意图。阅读 commit 消息、检查 PR、查看原始 issue/ticket。

3. **解决每个冲突块。** 尽可能保留双方的意图。当不兼容时，选择与合并既定目标一致的一方，并注明权衡。**不要**发明新行为。务必解决；绝不执行 `--abort`。

4. 查找项目的**自动化检查**并运行它们 —— 通常按类型检查、测试、格式化的顺序。修复合并破坏的任何内容。

5. **完成 merge/rebase。** 暂存所有内容并提交。如果是 rebase，继续 rebase 过程直到所有 commits 都已 rebase。
