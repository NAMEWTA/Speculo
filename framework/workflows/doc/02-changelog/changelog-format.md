# Changelog Format — 变更日志格式规范

本阶段输出可合并到项目 `CHANGELOG.md` 的变更条目。AI 在执行 `phase=format` 时读本文件作为填写指引。

## 一、上下文与产物

- **输入**：关联 change 的 `handoff.md`、提交摘要、PR 描述、用户提供的发版范围。
- **产物**：`changelog.md`（基于 `../_templates/changelog-template.md`）。
- **边界**：不写内部实现细节，除非该细节影响用户迁移、配置、性能或安全。

## 二、分组规则

- `Added`：新增用户可见能力。
- `Changed`：行为、默认值、配置、接口语义变化。
- `Fixed`：用户遇到的问题被修复。
- `Removed`：移除能力或兼容层。
- `Deprecated`：仍可用但未来会移除。
- `Security`：安全修复或风险缓解。

## 三、条目规则

- 每条用一句话描述用户影响；需要时补相对路径证据。
- 破坏性变更以 `BREAKING:` 开头，并说明迁移动作。
- 不确定是否用户可见时，默认放入"内部变更（不发布）"草稿段，等待用户确认。

## 四、完成准则（机器可验证）

- `grep -c '\[TODO:' changelog.md` = 0
- `changelog_entries_count` 等于非空 bullet 条目数
- 若 `breaking_changes=true`，文档中至少出现一次 `BREAKING:`
- `.status.json` 写入 `release_version`、`changelog_target`、`breaking_changes`、`changelog_entries_count`
