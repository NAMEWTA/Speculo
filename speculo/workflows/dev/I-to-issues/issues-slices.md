# Slice Issues Phase

> 本阶段将 PRD、计划或诊断结论拆为**可独立验证的垂直切片**（tracing bullet），产出兼具路线图信息密度的 `slices.md`。
> `slices.md` 融合了原 roadmap.md 的阶段规划能力——按 scope / architecture / phases / cross-cutting / dependency 五段结构组织，
> 同时保留 HITL/AFK 标记、用户确认与 issue 发布流程。

## 输入

- `prd.md`、`decision-log.md`、`diagnosis.md`、现有 issue 或用户计划
- 可选 issue tracker 配置和标签词汇表
- `I-to-issues.md` 中的内置切片指引
- 同级 change 目录下已有的 `context-map.md`、`decision-log.md`（若存在，用于继承领域术语与 ADR 引用）

## 产物

- `.speculo/dev/<change>/slices.md`，由 `../_templates/issues-slices-template.md` 填写

## `slices.md` 格式规范（五段结构）

`issues-slices-template.md` 提供模板骨架；AI 在填写时**必须**按以下五段结构展开，使 `slices.md` 融合 roadmap.md 的信息密度：

### 0. 一句话战略（strategic anchor）

单句概括本 change 的「做什么 + 为什么 + 怎么做到（以现有系统为基底 / 新建 / 复用）」。从 PRD 或用户意图提炼，为后续所有切片提供决策锚点。

### 1. 范围边界（IN / REUSE / OUT）

三列表格，逐条列出：
- **IN** —— 本次必造的新能力（每项可对应后续一个或多个切片）
- **REUSE** —— 复用现有系统的能力（不改动，只收编进新地基）
- **OUT** —— 本期不做、留给后续迭代的内容

表格来源优先从 PRD 或用户指令提取；若来源未明确，用 `[待确认]` 标记并提请用户补充。

### 2. 架构上下文（可选，有则填）

若 change 涉及多模块或改动既有架构，本节记录：
- 涉及的 `core/` / `src/` / `src-tauri/` 模块及其职责分工
- 新增模块的定位（一句话职责 + 落点目录）
- 不可逾越约束（来自 `AGENTS.md` 或 PRD 的硬性规则）

本节不是必需的；单文件修复或热点 patch 可省略。

### 3. 切片（phases）

每个切片是**一个从数据到 UI 的端到端闭环**（窄而完整）。切片按依赖顺序排列；每个切片包含：

```markdown
### 切片 N · 切片名称
<phase id="<phase-id>" status="未开始"><!-- 未开始 → 已实现(dev/03) → 已验证(dev/04) --></phase>

- **类型：** `AFK` | `HITL`
- **阻塞于：** 切片 M（或「无」）
- **覆盖：** PRD 章节 / US 编号 / 用户故事简述
- **交付物：** 该切片产出的具体文件/模块/功能清单
- **复用：** 复用哪些现有能力（模块/文件/命令）
- **验收切片：** 一个可独立执行的验证命令或手动检查步骤，证明本切片完成
- **对齐：** PRD FR-xxx 或 issue 引用
- **ADR 引用：** （可选）关联的工程层 ADR 编号
```

- `<phase id="...">` 是稳定的阶段标识（如 `phase0-node-base`、`phase1-templates`），供 `dev/03` TDD 工作流引用。单阶段 change 用 `phase0-<slug>`。
- `status` 枚举：`未开始`（切片创建时） → `已实现`（TDD finish 置入） → `已验证`（finalize 置入）。状态只前进不回退。

### 4. 横切关注点（贯穿所有切片）

列出跨切片一致的规则与约束，如：
- 磁盘契约先改 zod + fixtures 再改解析
- 删缓存可重建铁律
- 范围隔离规则（不 import 旧 AI 子系统等）
- 命名消歧规则

### 5. 依赖顺序速查

ASCII 依赖链，展示切片先后顺序：

```
P0  切片0  名称    ← 不可回退,最先
P1  切片1  名称
P2  切片2  名称    依赖 P0+P1
...
```

> **判据：** 每个切片的「验收切片」全部通过即该切片完成；所有切片完成 = change 可进入 `dev/04` 收尾。

## 填写引导

1. 遵循 `I-to-issues.md` 的内置切片指引和本文件的五段格式。
2. **采集来源**：从 PRD / decision-log / diagnosis / 用户指令中提取 IN/REUSE/OUT 三列、架构上下文和 ADR 引用；不确定的标记 `[待确认]`。
3. **切分垂直切片**：优先窄而完整、优先 AFK；每个切片必须有用户可独立验证的「验收切片」。
4. **标注 phase id**：为每个切片生成稳定的 `<phase id="...">` 标识（kebab-case），供 TDD 阶段直接引用。
5. 用编号列表向用户确认粒度、依赖、HITL/AFK 标记、phase id 和是否需要发布外部 issue。
6. 按依赖顺序记录切片；发布外部 issue 时也按依赖顺序发布。
7. 迭代直到用户批准分解；未批准前不发布外部 issue。

## 边界

- 不关闭或修改父级 issue。
- 不默认发布到外部 tracker。
- 不写实现代码。
- 不编造来源；PRD/ADR/issue 引用必须真实存在。

## 完成准则

- `slices.md` 无残留 `[TODO:]`
- 每个切片都有 `<phase id="...">` 标识、类型、依赖、覆盖来源、验收切片
- IN/REUSE/OUT 表格完整（无法确定时标 `[待确认]` 并已获用户补充）
- `.status.json` 已记录 `slice_count`、`hitl_slice_count` 和 `issue_tracker_mode`
