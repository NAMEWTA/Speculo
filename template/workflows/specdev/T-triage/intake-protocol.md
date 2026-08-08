# Intake Protocol

仅在 Triage `mode=intake` 时加载。本协议把外部输入转换为不可静默覆盖的本地来源快照。

## 1. 解析来源

按以下优先级确定 `source_type`：GitHub Issue/PR URL、普通 URL、项目相对文件、用户粘贴内容、当前对话。来源为 GitHub 时调用 `<Path>{roots.skills}/github-npm-ops/SKILL.md</Path>` 的 `issue-read` 或 `pr-read`；其他 URL 使用当前环境可用的只读读取能力。读取失败时保持 blocked，并请求用户提供导出或粘贴内容。

只记录规范化 URL、项目相对 Path 或 null；不保存机器绝对路径、认证信息、Cookie 或令牌。

## 2. 查重与漂移

在 active 和 archive 的 `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>` 或对应归档 Source 中查询相同 `canonical_locator`：

- locator 与 hash 相同：恢复已有 change，不创建副本；
- locator 相同但 hash 不同：展示漂移，不覆盖原快照；只有用户确认后才创建新 change，并在新 source 中记录 `supersedes_source`；
- 没有稳定 locator：按用户指定 change 或新 change 继续。

## 3. 冻结内容

GitHub 来源保存 title、body、author、state、labels、created/updated 和截至捕获时可见的全部评论。普通 URL 保存可读正文和元数据；项目文件保存内容及项目相对 Path；粘贴或对话保存用户原文。

在计算 SHA-256 前移除秘密、令牌、Cookie、个人隐私和不应长期保存的敏感日志，并在 Redactions 记录类型，不记录原值。附件默认只留 URL 与描述。

使用 `<Path>{roots.workflows}/specdev/T-triage/source-template.md</Path>` 写临时文件，重读并验证后原子替换目标。已有 `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>` 永不就地覆盖。

## 完成标准

- 来源类型、locator、捕获时间、hash 和关闭能力已确定；
- 完整可持久化正文与评论已冻结；
- 重复和漂移分支有唯一结果；
- 失败没有生成伪造或不完整的 Ready source。
