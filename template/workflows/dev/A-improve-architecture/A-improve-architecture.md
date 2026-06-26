---
id: dev/A-improve-architecture
category: dev
name: Improve Architecture
description: 扫描代码库寻找深化机会，以可视化 HTML 报告呈现候选，再对选中方向深入质询并沉淀领域模型
keywords: [architecture, deepening, deep-module, refactor, 架构, 深化, 接缝]
---

# Improve Architecture 工作流执行指引

本工作流是 `dev/A` 入口：浮现架构摩擦、提出**深化机会**（把浅模块转化为深模块的重构），目标是可测试性与 AI 可导航性。它**建立在共享设计词汇与项目领域模型之上**：

- 架构词汇与原则（模块 / 接口 / 深度 / 接缝 / 适配器 / 杠杆 / 局部性；删除测试、「接口就是测试表面」、「一个适配器 = 假设接缝，两个 = 真实接缝」）统一引用 `../../../vendor/codebase-design/SKILL.md`（及 `DEEPENING.md`）。在每条建议中**严格使用**这些术语——不要偏离到「组件 / 服务 / API / 边界」。
- 领域语言来自 `speculo/.speculo/.config/context/CONTEXT.md`（为好接缝命名）；`speculo/.speculo/.config/adr/` 中的 ADR 记录本工作流**不应重新争议**的决策。领域模型的主动维护见 `../M-domain-modeling/M-domain-modeling.md`。

## 内置指引

### 何时使用

当用户想系统性发现并落实架构深化机会（让代码更可测试、对 AI 更可导航）时使用。也可由 `../H-diagnose/H-diagnose.md` 在修复后转入——当 Bug 根因涉及架构（没有好接缝、纠缠调用者、隐藏耦合）时。

### 输入

- 当前 git 仓库与待改进的代码区域
- `speculo/.speculo/.config/context/CONTEXT.md` 领域词汇、触及区域的 `speculo/.speculo/.config/adr/` ADR
- 设计词汇单一事实源 `../../../vendor/codebase-design/SKILL.md`、`DEEPENING.md`、`DESIGN-IT-TWICE.md`
- 当前 change 目录：`speculo/.speculo/dev/<change>/`（`<change>` 必须为 `YYYY-MM-DD-<kebab-name>`，例：`2026-06-12-deepen-order-intake`）

### 输出

- `speculo/.speculo/dev/<change>/architecture-candidates.md` —— 结构化深化候选清单
- `speculo/.speculo/dev/<change>/architecture-review.html` —— 可视化架构审查报告（前后对比图 + 推荐强度）
- `speculo/.speculo/dev/<change>/architecture-design.md` —— 选中候选经质询后的接口设计与决策
- 经用户确认后更新 `.config/context/`、`.config/adr/`（经 `../M-domain-modeling/`）

（`<change>` 格式：`YYYY-MM-DD-<kebab-name>`）

### 核心原则（引用 codebase-design）

- **删除测试**：对任何疑似浅的模块，想象删除它——复杂性会集中（好信号，值得深化）还是只是移动？
- **深度是接口的属性**：小接口 + 大量实现；深化 = 缩小接口、把复杂性吸收进实现。
- **接缝纪律**：一个适配器 = 假设接缝，两个 = 真实接缝；不要为单一实现凭空切接缝。
- 完整原则、依赖类别与「替换而非叠加」测试策略见 `../../../vendor/codebase-design/SKILL.md` 与 `DEEPENING.md`，本工作流不复制。

### 渐进披露

- `HTML-REPORT.md`：编写 `architecture-review.html` 时读取——完整 HTML 框架、图表模式与样式指南。

### 独立使用

本工作流**零硬依赖**，无需预先执行其他工作流即可独立进入（`dev/A`）。只需当前 git 仓库即可启动；缺 change 目录时按下「自初始化」创建；缺 CONTEXT / ADR 时按代码现状探索，不阻塞。

### 缺少 change 目录时的自初始化

若当前无对应 change 目录：

1. 从用户意图提取 `<kebab-name>`（如 `deepen-order-intake`）
2. 创建 `speculo/.speculo/dev/<YYYY-MM-DD>-<kebab-name>/`
3. 初始化 `.status.json`：
   ```json
   {
     "dev_entry": "dev/A",
     "current_phase": "1. Scan",
     "phase_history": [],
     "change_status": "active",
     "embedded_guides": ["improve-architecture"],
     "candidate_count": 0,
     "selected_candidate": null,
     "report_path": null,
     "architecture_status": "scanning"
   }
   ```
4. 在 `speculo/.speculo/dev-status.json` 的 `active` 数组追加该 change 目录名

## 阶段

> **持久化铁律**：所有产物（含 HTML 报告）写入 `speculo/.speculo/dev/<change>/`，**禁止写入 `temp/`、系统临时目录或项目根目录**。

### 1. Scan — 探索深化候选
- 规范：本入口「核心原则」+ `../../../vendor/codebase-design/SKILL.md`、`../../../vendor/codebase-design/DEEPENING.md`
- 模板：无（候选条目结构见下「引导」第 4 步）
- 产物：`architecture-candidates.md`
- 引导：
  1. 先读 `speculo/.speculo/.config/context/CONTEXT.md` 与触及区域的 `.config/adr/`。
  2. 用 Agent 工具（`subagent_type=Explore`）有机地遍历代码库，注意摩擦：理解一个概念要在许多小模块间跳转？模块浅（接口几乎和实现一样复杂）？纯函数仅为可测试性而提取、真 bug 藏在其调用方式里（没有局部性）？紧耦合模块在接缝处泄漏？哪些区域难以通过当前接口测试？
  3. 对每个疑似浅模块应用**删除测试**，保留「删除会集中复杂性」的候选。
  4. 每个候选记录：**涉及文件**、**问题**（当前摩擦）、**解决方案**（通俗语言）、**收益**（用局部性 / 杠杆 / 测试改善表述）、**依赖类别**（进程内 / 本地可替换 / 端口与适配器 / mock）、**推荐强度**（强烈 / 值得探索 / 推测性）。
  5. 与现有 ADR 冲突的候选，仅在摩擦真实到值得重审 ADR 时保留，并在条目中显式标注（如「与 ADR-0007 矛盾——但因……值得重新讨论」）。
- 完成准则：
  - 候选均用 codebase-design 词汇命名（不散用「组件 / 服务 / 边界」）
  - 每个候选含文件、问题、解决方案、收益、依赖类别、推荐强度
  - `architecture-candidates.md` 无残留 `[TODO:]`

### 2. Report — 可视化架构审查报告
- 规范：`HTML-REPORT.md`
- 模板：无
- 产物：`architecture-review.html`
- 引导：
  1. 按 `HTML-REPORT.md` 编写**自包含** HTML（Tailwind + Mermaid 走 CDN），每个候选一张卡片含**前后对比图**，结尾「首要推荐」段。
  2. 写入 `speculo/.speculo/dev/<change>/architecture-review.html`（**不写临时目录**），用 OS 命令打开（macOS `open <path>`、Linux `xdg-open <path>`、Windows `start <path>`），并告知用户绝对路径。
  3. 领域用 CONTEXT 词汇、架构用 codebase-design 词汇。
  4. 此时不提接口设计；写入并打开后，询问用户：「这些候选你想探索哪一个？」
- 完成准则：
  - HTML 自包含、每个候选有前后对比图与推荐强度徽章、含首要推荐段
  - 报告写入 change 目录并已为用户打开
  - 已请用户选择候选

### 3. Grill — 质询所选候选并沉淀
- 规范：`../../../skills/grill-me/SKILL.md`（逐问压测）+ `../M-domain-modeling/M-domain-modeling.md`（内联沉淀）
- 模板：无
- 产物：`architecture-design.md`；经用户确认后更新 `.config/context/`、`.config/adr/`
- 引导：
  1. 用 `../../../skills/grill-me/SKILL.md` 与用户走设计树：约束、依赖、深化后模块形态、接缝后面是什么、哪些测试存活。
  2. 决策结晶时按 `../M-domain-modeling/M-domain-modeling.md` 内联沉淀：深化模块用了 CONTEXT 没有的概念 → 加术语；锐化了模糊术语 → 更新 CONTEXT；用户以关键理由否决候选 → 按 ADR 三判据决定是否记 ADR（防止未来架构审查重复建议同一件事）。
  3. 想探索深化模块的备选接口时，按 `../../../vendor/codebase-design/DESIGN-IT-TWICE.md` 的「设计两次」并行子代理模式。
- 完成准则：
  - 选中候选的接口、依赖策略与适配器、存活测试已记入 `architecture-design.md`
  - 决策结晶处的术语 / ADR 已按 `../M-domain-modeling/` 沉淀（经用户确认）
  - `architecture-design.md` 无残留 `[TODO:]`

## 依赖

- 硬依赖：无（零依赖横向工作流）
- 软依赖：无。可独立进入；也可由 `../H-diagnose/H-diagnose.md` 修复后转入。建立在 `../../../vendor/codebase-design/`（设计词汇）与 `../M-domain-modeling/`（领域模型）之上；深化的实现落地交由 `../03-tdd/03-tdd.md`。

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `dev_entry` (string) — 固定为 `dev/A`
- `embedded_guides` (array) — 包含 `improve-architecture`
- `candidate_count` (number) — 深化候选数量
- `selected_candidate` (string|null) — 用户选中的候选
- `report_path` (string|null) — `speculo/.speculo/dev/<change>/architecture-review.html`
- `architecture_status` (scanning | reported | grilling | designed | blocked) — 工作流状态

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- 报告生成后写入 `candidate_count`、`report_path`，置 `architecture_status: reported`。
- 用户选定并质询后写入 `selected_candidate`，置 `architecture_status: designed`。
- 写 `.config/context/` 或 `.config/adr/` 前必须经用户确认（经 `../M-domain-modeling/`）。
- 本工作流不自动完成 change；深化的实现交由 `../03-tdd/03-tdd.md` 落地。
