---
id: dev/I-to-issues
category: dev
name: To Issues
description: 将 PRD、计划或诊断结论拆成可独立接手的垂直切片 issue
keywords: [issues, slices, vertical, AFK, HITL, 切片]
---

# To Issues 工作流执行指引

本工作流是 `dev/I` 入口。它既可独立执行，也可嵌入 `dev/01`、`dev/02`、`dev/03` 或 `dev/H`，用于生成垂直切片。垂直切片和 issue 发布指引已内置在本 workflow 目录中。

## 内置指引

使用垂直切片（示踪弹）将计划、规格或 PRD 分解为可独立接手的 issue。

### 输入

- PRD、计划、设计记录、bug 诊断结论或当前对话上下文
- 用户明确提供的 issue tracker 配置和标签词汇表（如果存在）
- 当前 change 目录：`speculo/.speculo/dev/<change>/`（`<change>` 必须为 `YYYY-MM-DD-<kebab-name>`，例：`2026-06-12-user-auth`）

### 输出

- `speculo/.speculo/dev/<change>/slices.md`
- 垂直切片清单、依赖关系、HITL/AFK 标记和验收标准
- 可选的外部 issue 引用

（`<change>` 格式：`YYYY-MM-DD-<kebab-name>`）

### 垂直切片规则

- 每个切片交付一条贯穿所有层（schema、API、UI、测试）的窄但完整的路径。
- 完成的切片可独立演示或验证。
- 优先选择多个薄切片而非少数厚切片。

切片可以是 `HITL` 或 `AFK`。HITL 切片需要人类交互，例如架构决策或设计评审。AFK 切片可以在无人类交互的情况下实现和合并。尽可能优先选择 AFK 而非 HITL。

默认只生成本地切片计划。只有 tracker 已配置且用户明确要求时，才发布外部 issue；发布时按依赖顺序发布，以便被阻塞字段引用真实 issue 标识符。不要关闭或修改任何父级 issue。

### 切片计划质量准则

`slices.md` 不是清单，而是一份可被下游直接接手的**切片计划**。借鉴高质量 plan 的纪律：

- **Context 先行**：先写清*为什么*、**已确认决策**（范围拍板，防下游重新扯皮）与**关键核实结论**（探索得到的事实），再展开切片。
- **存疑即问**：方案有未决分支时，按本工作流「存疑时的提问协议」用 `AskUserQuestion` 一次一问、带推荐、逐步锁定，不臆测。
- **行号现场核对**：引用的行号/路径均为*近似*，实施时以现场代码为准；在计划内写明这一点，避免下游照搬过期行号。
- **保留/不动同等重要**：每个切片既写「改什么」，也写「**保留/不动什么**」——告诉执行者哪些不能碰。
- **验证分层**：删除型切片的验收须含残留扫描（grep 0 命中）；change 级验证总览走真实运行的冒烟与（如涉及）迁移测试。
- **复用优先于新造**：能复用就不新建，在切片「复用」字段与 §1 REUSE 列显式记录。
- **重型小节按需**：风险登记、退役清单、架构上下文是条件段——复杂 change 铺开，单文件小改可省。

### 独立使用

本工作流**零硬依赖**，无需预先执行 dev/01、dev/02 等其他工作流即可独立进入。只需用户描述任务意图 + 当前 git 仓库即可启动。

**独立进入流程：**

1. **change 目录**：若用户未指定 `<change>` 目录，按 `YYYY-MM-DD-<kebab-name>` 格式创建（如 `2026-06-17-refactor-auth`），初始化 `.status.json` 并更新 `dev-status.json`。
2. **信息自采集**：若同 change 目录下无上游产物（PRD、decision-log、diagnosis 等），**自行通过代码库探索采集切片所需上下文**，不要求用户先执行其他工作流：
   - 探索项目目录结构，建立模块心智模型（`src/`、`core/`、`tests/` 等）
   - 读取 `AGENTS.md`、`README.md`、`CONTRIBUTING.md` 了解项目规范与架构约定
   - `git log --oneline -30` 了解近期变更趋势和相关模块
   - 搜索相关代码区域的注释、TODO、FIXME 和现有 issue 引用
   - 读取 `speculo/.speculo/.config/RULES.md` 和 `speculo/.speculo/.config/adr/` 了解项目决策
3. **深度搜索**：信息仍不足时，执行以下顺序的深度探寻：
   - 搜索项目中与用户意图关键词匹配的代码、注释和文档
   - 追溯相关模块的 git history（`git log -p -- <path>`）
   - 搜索 `speculo/.speculo/doc/` 和 `speculo/.speculo/archive/` 中已有的领域文档
   - 检查现有测试文件了解模块契约和边界行为
4. **存疑即问**：仅在代码库探索无法确定的决策分支上，按「存疑时的提问协议」使用 `AskUserQuestion` 一次一问、带推荐、逐步锁定。

### 缺少 change 目录时的自初始化

若当前无对应 change 目录，按以下步骤创建：

1. 从用户意图提取 `<kebab-name>`（如 `refactor-auth`、`add-export-feature`）
2. 创建 `speculo/.speculo/dev/<YYYY-MM-DD>-<kebab-name>/`
3. 初始化 `.status.json`：
   ```json
   {
     "dev_entry": "dev/I",
     "current_phase": "1. Slice Issues",
     "phase_history": [],
     "change_status": "active",
     "embedded_guides": ["to-issues"],
     "slice_count": 0,
     "hitl_slice_count": 0,
     "published_issue_refs": [],
     "issue_tracker_mode": "local-only"
   }
   ```
4. 在 `speculo/.speculo/dev-status.json` 的 `active` 数组中追加该 change 目录名

## 阶段

### 1. Slice Issues — 垂直切片分解
- 规范：`issues-slices.md`
- 模板：`../_templates/issues-slices-template.md`
- 产物：`slices.md`
- 完成准则：
  - §0 战略与背景含**已确认决策**与**关键核实结论**（独立进入时自采集，有上游则继承）
  - 每个切片都有标题、类型、依赖、覆盖来源、验收切片；删除型切片标注**保留/不动**
  - 已确认粒度、依赖和 HITL/AFK 标记
  - §8 验证总览存在（静态 → 残留扫描 → 冒烟，按适用项）
  - `slices.md` 无残留 `[TODO:]`

## 依赖

- 硬依赖：无
- 软依赖：无。若同 change 目录下存在其他工作流产物（如 prd.md、decision-log.md、diagnosis.md），可继承其信息加速执行；缺失时自行采集，不阻塞流程。完成后通常移交 `../03-tdd/03-tdd.md`，此为推荐后续而非必须。

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `dev_entry` (string) — 固定为 `dev/I`
- `embedded_guides` (array) — 包含 `to-issues`
- `slice_count` (number) — 切片数量
- `hitl_slice_count` (number) — HITL 切片数量
- `published_issue_refs` (array) — 已发布 issue 引用，默认空
- `issue_tracker_mode` (disabled | local-only | publish-requested | published) — issue tracker 使用状态

## 完成与状态更新

- 默认只生成本地 `slices.md`。
- 只有 tracker 已配置且用户明确要求时才发布外部 issue。
- 完成后不自动完成 change；通常移交 `../03-tdd/03-tdd.md`。
