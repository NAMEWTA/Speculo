---
command: project-maintenance
mode: <audit|update|commit>
result: <verified|not-committed|no-op|no-candidates|unsupported|partial|blocked>
scope: [docs]
coverage: <workspace|explicit-subtree|selected-objects>
workflows: []
generated_at: <ISO-8601>
---

# 项目维护报告

## 输入与覆盖

- 已选 docs/knowledge/archive 范围、对象与依赖顺序：<实际值>
- docs 涉及 Git 时的固定 HEAD、FROM_SHA 或 bootstrap/non-git：<实际值>
- 变化线索复现：<git diff FROM_SHA..INPUT_HEAD，或无基线原因>
- 全局盘点范围、文档总量、排除/只读目录与理由：<清单>
- 未提交 overlay 及事实限制：<路径和影响，不抄敏感内容>

## 处置与效果

| Scope | 目标 | Owner | 处置 | 事实证据 | 授权 | 实际结果/恢复 |
|---|---|---|---|---|---|---|

<覆盖每个纳入目标和新增缺口。audit 全为候选；propose-only 注明原网关；未完成项不写成已执行。>

## 领域回执（涉及 knowledge/archive 时）

<按原 Work 回执列出知识条目、索引、归档 locator、实际验证、未闭合目标与恢复点；记录重复目标合并后的唯一 writer，必需维护失败时未移动哪些依赖对象。>

## 验证

<实际命令、退出码、相关结果、未验证行为；没有变化时说明 no-op。>

## 提交与状态（仅 commit）

<批准路径、提交 SHA/父节点、无关 index/工作区保持情况、state v4 与实际 sidecar v1；无提交或失败时说明原因与候选状态恢复位置。audit/update 不推进游标。>
