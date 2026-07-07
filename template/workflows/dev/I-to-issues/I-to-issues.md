---
id: dev/I-to-issues
category: dev
name: To Issues
description: 将 PRD、计划或诊断结论拆成可独立接手的垂直切片 issue
keywords: [issues, slices, vertical, AFK, HITL, 切片]
---

# To Issues 工作流执行指引

本工作流是 `dev/I` 入口。它既可独立执行，也可嵌入 `dev/01`、`dev/02`、`dev/03` 或 `dev/H`，用于生成垂直切片。

## 铁律

```
没有精确到文件路径的改动清单，不算垂直切片
```

## 内置文档

- `issues-slices.md` — 切片分解规范、深度搜索协议、质量准则与提问协议
- `../_templates/issues-slices-template.md` — `slices.md` 骨架
- `../../../vendor/codebase-design/SKILL.md` — 设计词汇单一事实源（模块 / 接口 / 接缝 / 适配器 / 深度 / 杠杆 / 局部性）

## 输入与输出

- **输入**：PRD、计划、诊断结论或当前对话；当前 change 目录 `speculo/.speculo/dev/<change>/`
- **输出**：`slices.md`（垂直切片清单、依赖、HITL/AFK 标记、验收标准）；可选外部 issue 引用

## 垂直切片规则

- 每个切片交付一条贯穿所有层的窄但完整路径；优先多个薄切片而非少数厚切片
- 切片标记 `HITL` 或 `AFK`；尽可能优先 AFK
- 默认只生成本地切片计划；仅 tracker 已配置且用户明确要求时才发布外部 issue

## 独立使用

本工作流**零硬依赖**。只需用户描述任务意图 + 当前 git 仓库即可启动。

1. **change 目录**：若无 active change，执行 `../AGENTS.md` 进入协议步骤 3（原子三步），不得内联自初始化 JSON。
2. **信息自采集**：无上游产物时，按 `issues-slices.md`「独立进入时的深度搜索协议」自行采集。
3. **存疑即问**：仅在代码库探索无法确定的决策分支上，按 `issues-slices.md`「存疑时的提问协议」使用 `AskUserQuestion`。

### 缺少 change 目录时

若无 active change，执行 `../AGENTS.md` 进入协议步骤 3（原子三步），不得内联自初始化 JSON。

## 阶段

### 1. Slice Issues — 垂直切片分解
- id：`slice-issues`
- 规范：`issues-slices.md`
- 模板：`../_templates/issues-slices-template.md`
- 产物：`slices.md`
- 完成准则：
  - §0 含已确认决策、当前现状与关键核实结论
  - 每个切片有文件表、实现要点、验收切片；删除型切片标注保留/不动
  - 涉及 schema 变更时 §2.5 已填写；§5.5 关键决策已汇总；§8 验证总览存在
  - `slices.md` 无残留 `[TODO:]`

## 依赖

- 硬依赖：无
- 软依赖：同 change 下若有 `prd.md`、`diagnosis.md` 等可继承加速；完成后通常移交 `../03-tdd/03-tdd.md`

## 状态扩展字段

- `dev_entry` (string) — 固定为 `dev/I`
- `embedded_guides` (array) — 包含 `to-issues`
- `slice_count` (number)
- `hitl_slice_count` (number)
- `published_issue_refs` (array)
- `issue_tracker_mode` (disabled | local-only | publish-requested | published)

## 完成与状态更新

- 默认只生成本地 `slices.md`。
- 只有 tracker 已配置且用户明确要求时才发布外部 issue。
- 完成后不自动完成 change；通常移交 `../03-tdd/03-tdd.md`。
