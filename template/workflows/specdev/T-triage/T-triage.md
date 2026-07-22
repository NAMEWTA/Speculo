---
id: specdev/triage
type: workflow-entry
workflow: specdev
name: Issue 分诊
description: 将外部 issue 摄入并分诊为本地 change：深度理解上下文后写入 source-issue.md 与 triage.md，再推荐下一 work（G-grill / S-spec / I-implement / D-diagnose 等）。
keywords: [分诊, triage, issue, 摄入, 变更引导, needs-triage]
---

# Issue 分诊

将外部 issue **分诊**为本地 change 引导：摄入 → 深度理解 → 写入 `source-issue.md` 与 `triage.md` → 推荐下一 work 后停止。本 work 只落本地产物；ADR / LOG / CONTEXT / spec / ticket 与 tracker 写回由其他 work 或 `common/triage` skill 负责。

产物路径：`<Path>{roots.state}/specdev/changes/{change}/</Path>`（`{change}` = `<YYYY-MM-DD>-<topic>`）。

## 流程

### 1. 摄入 Issue

加载 `<Path>{roots.workflows}/specdev/T-triage/intake-rules.md</Path>`。将 `#N`、URL、粘贴正文或口头描述规范化为统一结构（source、title、body、comments、来源标识）。`gh` 可用则拉取；否则请用户粘贴或补齐最小字段。

**完成标准**：标题、正文、评论与来源标识齐全，或已标注 paste/manual 且最小字段已齐。

### 2. 深度理解

加载 `<Path>{roots.workflows}/specdev/T-triage/understanding-rules.md</Path>`。行为契约对齐 `<Path>{roots.workflows}/specdev/common/triage/AGENT-BRIEF.md</Path>`；范围外只读去重遵循 `<Path>{roots.workflows}/specdev/common/triage/OUT-OF-SCOPE.md</Path>`。

读取永久 `<Path>{roots.state}/specdev/adr/</Path>`、`<Path>{roots.state}/specdev/context/</Path>`（若有）；按领域概念探查代码库；扫描 `.out-of-scope/`；对 bug 做轻量可复现判定；归类 `bug` | `enhancement` 并列出具体信息缺口。

**完成标准**：类别已判定；冗余与范围外结果已报告；验证结果或缺口已明确；足以起草行为摘要或已穷尽缺失问题。

### 3. 选择 / 创建 Change

读 `<Path>{roots.state}/specdev/status.json</Path>`（INDEX 启动协议）：新 issue 默认创建 `changes/<YYYY-MM-DD>-<kebab-topic>/`；仅用户声明续作时复用 active；多候选先消歧。在 `active` 数组中追加条目 `{ change, current_work: "specdev/triage", works_run: [], result: null }`；`work_history` 追加进行中记录（含 `change` 字段，缺字段时按 INDEX 补齐）。创建 change 目录后写入初始 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`（`change_status: "active"`、`created_at` 为当前时间）。

**完成标准**：`{change}` 目录存在；`active` 含该 change；`current_work` 为 `"specdev/triage"`。

### 4. 写入分诊产物

加载 `<Path>{roots.workflows}/specdev/T-triage/artifact-templates.md</Path>`，仅写入：

1. `<Path>{roots.state}/specdev/changes/{change}/source-issue.md</Path>` — 原文快照
2. `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>` — 分诊结论、行为契约草案、推荐 status 与 next work

推荐 status 只记在 `triage.md`。标签字符串可读 `<Path>{roots.state}/specdev/.config/status-labels.md</Path>`（若有），否则用角色名。

**完成标准**：两文件已落盘；含类别、推荐 status、行为契约草案与 next work；无残留 `[TODO:]`（`needs-info` 的信息缺口列表除外）。

### 5. 路由推荐

加载 `<Path>{roots.workflows}/specdev/T-triage/routing-rules.md</Path>`。首匹配恰好一条主推荐（可附一条备选），写入 `triage.md` 并展示 Path 与理由。

**完成标准**：主推荐已展示；下游尚未启动。

### 6. 停止并交接

更新 `<Path>{roots.state}/specdev/status.json</Path>`：`active` 中对应条目的 `current_work = null`；`work_history` 对应条目补 `completed_at`、`result`（无 `artifacts` 字段）。汇报 change、类别、status、next work、产物路径；明确询问是否进入推荐 work。用户确认前保持代码与下游不动。

**完成标准**：status 已更新；用户已收到摘要与确认问题；本 work 结束。

## 子文件引用

| 文件 | 内容 | 触发条件 |
|------|------|----------|
| `<Path>{roots.workflows}/specdev/T-triage/intake-rules.md</Path>` | gh / 粘贴摄入、字段规范化 | 步骤 1 |
| `<Path>{roots.workflows}/specdev/T-triage/understanding-rules.md</Path>` | 理解清单、冗余与范围外 | 步骤 2 |
| `<Path>{roots.workflows}/specdev/T-triage/artifact-templates.md</Path>` | 两产物模板 | 步骤 4 |
| `<Path>{roots.workflows}/specdev/T-triage/routing-rules.md</Path>` | 首匹配路由与话术 | 步骤 5 |
| `<Path>{roots.workflows}/specdev/common/triage/AGENT-BRIEF.md</Path>` | 行为契约原则 | 步骤 2/4 起草摘要 |
| `<Path>{roots.workflows}/specdev/common/triage/OUT-OF-SCOPE.md</Path>` | 范围外只读去重 | 步骤 2 扫描时 |

## 依赖关系

- **上游**：外部 issue（`gh` 或用户）；可选永久 adr/context；可选 `.out-of-scope/`
- **下游**（确认后）：`<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>`、`<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>`、`<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>`、`<Path>{roots.workflows}/specdev/D-diagnose-bugs/D-diagnose-bugs.md</Path>`、`<Path>{roots.workflows}/specdev/W-wayfinder/W-wayfinder.md</Path>`
- **并列**：`<Path>{roots.workflows}/specdev/common/triage/SKILL.md</Path>` 仍可独立做 tracker 状态机；本 work 只引用其 AGENT-BRIEF / OUT-OF-SCOPE
