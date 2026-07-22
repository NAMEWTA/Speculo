# 分诊产物模板

本 work 在 change 目录**仅**写入以下两个文件。路径：

- `<Path>{roots.state}/specdev/changes/{change}/source-issue.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`

行为契约章节对齐 `<Path>{roots.workflows}/specdev/common/triage/AGENT-BRIEF.md</Path>`，但落在本地文件，而非 tracker 评论。

推荐 status 角色字符串：若存在 `<Path>{roots.state}/specdev/.config/status-labels.md</Path>`，使用其「标签」列；否则使用角色名本身（`needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`）。

---

## source-issue.md

```markdown
# Source Issue

- **Source:** gh | paste | manual
- **Kind:** issue | pr | manual
- **ID:** #N 或 n/a
- **URL:** <url 或空>
- **Fetched at:** <ISO-8601>
- **Author:** <作者>
- **Labels:** <逗号分隔，或无>
- **State:** <open/closed 或空>

## Title

<标题>

## Body

<正文原文>

## Comments

### @<author> (<date>)

<body>

<!-- 无评论时写：_无评论_ -->
```

填写规则：

- 保留摄入时快照；远端后续编辑不自动同步
- 评论按时间顺序；过长可摘要并注明「已截断，完整内容见远端 #N」
- `manual` 来源：Body 由问题描述 + 期望行为组成，并在顶部注明「非远端快照」

---

## triage.md

```markdown
# Triage: <一句话主题>

- **Change:** <YYYY-MM-DD-kebab-topic>
- **Category:** bug | enhancement
- **Recommended status:** needs-triage | needs-info | ready-for-agent | ready-for-human | wontfix
- **Recommended next work:** <显示名> | none
- **Source:** [./source-issue.md](./source-issue.md)
- **Verification:** confirmed | not-reproduced | needs-info | n/a

## 问题摘要

<用户可理解的一两句>

## 理解结论

- **代码库现状：** <相关模块/接口与现状行为>
- **验证结果：** <同上 Verification，可附命令/证据>
- **冗余 / 范围外：** none | 已实现于… | 匹配 `.out-of-scope/<concept>.md`（用户选择：确认/重新考虑/不相关）

## 行为契约草案

**Current behavior:**
<当前发生什么>

**Desired behavior:**
<完成后应发生什么；含边界与错误条件>

**Key interfaces:**
- `<TypeOrFn>` — 需要改变什么以及为什么
- …

**Acceptance criteria:**
- [ ] <可独立验证的标准 1>
- [ ] <可独立验证的标准 2>

**Out of scope:**
- <本 change 明确不做的事项>

## 信息缺口

<!-- needs-info 或仍有开放问题时填写；否则写「无」 -->

- <具体可回答的问题 1>
- <具体可回答的问题 2>

## 推荐下一 Work

- **主推荐：** <Path>{roots.workflows}/specdev/<Work>/<Work>.md</Path> 或 `none`
- **理由：** <对应 routing-rules 首匹配条件的一句话>
- **备选：** <可选一条 Path 或 none>
- **停止说明：** 用户确认前不启动下游 work
```

填写规则：

- 一句话主题来自 issue 标题的 kebab 压缩语义，与 change 目录名一致或为其可读版
- `Recommended next work` 显示名与路由表一致（如「设计访谈」「编写 Spec」「实现」「诊断」「寻路」「none」）
- 行为契约不足时：status 倾向 `needs-info`，next 为 `none`，缺口章节穷尽
- 已实现或用户确认拒绝：status `wontfix`，next `none`；范围外文件仅提示，默认不自动创建
- 无残留 `[TODO:]` 占位符

## 完成检查

- 两文件均已存在于 `{change}` 目录
- `triage.md` 元数据五行齐全（Change / Category / Recommended status / Recommended next work / Source）
- 行为契约五块齐全（Current / Desired / Key interfaces / AC / Out of scope）——`needs-info` 时 AC 可较少，但缺口必须穷尽
- 主推荐 Path 使用 `{roots.workflows}` 别名，或为字面 `none`
