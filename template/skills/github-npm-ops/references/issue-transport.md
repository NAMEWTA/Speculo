# GitHub Issue Transport

本合同提供 GitHub 的读取和受控写入原语，不承担 SpecDev tracker、change、Ticket、Map 或报告所有权。

## 操作

- `issue-read`：读取 title、body、state、URL、author、labels、时间与全部可见评论。
- `pr-read`：读取 PR 正文、评论、文件列表以及不可变 base/head SHA。
- `issue-search`：按 query 返回候选，用于去重。
- `issue-create`：默认 dry-run；调用方确认后使用 `--apply`。
- `issue-comment-close`：按 marker 幂等评论并关闭；默认 dry-run，只有调用方确认后使用 `--apply`。

脚本：`scripts/issue-transport.mjs`。所有参数通过 argv 传递，不使用 shell 拼接；输出为 JSON，失败退出非零。

## 写入边界

调用方必须在执行前展示 repo、Issue、标题或评论、labels/reason 和准确动作，并取得本次明确授权。脚本的 `--apply` 只表示调用方已经完成该确认，不替代授权本身。

不得把 token、Cookie、认证输出、机器绝对路径或包含秘密的正文写入长期工件。部分失败由调用方保存已完成步骤和恢复条件；不得因远程失败回滚本地事实。

## 完成标准

- 读取结果可以冻结为调用方拥有的工件；
- dry-run 的外部写入为零；
- comment-close 的 marker 使重试不会重复评论；
- 成功结论来自执行后的远程重读。
