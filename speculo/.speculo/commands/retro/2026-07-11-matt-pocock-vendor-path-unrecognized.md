---
command: retro
mode: issue-retro
scope: matt-pocock-workflow
workflows: [matt-pocock]
changes: []
generated_at: 2026-07-11T00:00:00+08:00
---

# Speculo Retro Report

## 复盘范围

matt-pocock workflow 的 triage 路由（issue 需求收集分类）无法识别已安装的 vendor skills。用户已确认 vendor skills 存在于 `speculo/vendor/matt-pocock/` 及其子目录（engineering/triage、productivity/grilling、engineering/domain-modeling 等），但 workflow 运行时无法激活这些 skills。

## 信号来源

1. **当前对话上下文** — 用户尝试使用 triage 路由进行 issue 收集分类，但系统报告 vendor skills 未安装，用户手动验证文件存在后发现仍不识别。
2. **`speculo/.speculo/workspace.json`** — `roots.vendor` = `"speculo/vendor"`，与 WORKFLOW.md 的 `<root id="vendor:matt-pocock" base="vendor" path="matt-pocock" />` 组合解析后应为 `speculo/vendor/matt-pocock/`，与文件实际位置一致。
3. **`speculo/workflows/matt-pocock/WORKFLOW.md`** — runtime-context 声明 vendor:matt-pocock 根，triage route 引用 `<skill root="vendor:matt-pocock" path="engineering/triage/SKILL.md" />`。
4. **`speculo/skills/runtime-context/references/path-resolution.md`** — 规范声明 vendor 可声明零个或多个具名根，但未定义 vendor root 的边界检查与存在性验证的具体实现步骤。
5. **文件系统** — 所有被引用的 vendor skill 文件均存在于预期路径：
   - `speculo/vendor/matt-pocock/engineering/triage/SKILL.md` ✅
   - `speculo/vendor/matt-pocock/productivity/grilling/SKILL.md` ✅
   - `speculo/vendor/matt-pocock/engineering/domain-modeling/SKILL.md` ✅
   - `speculo/vendor/matt-pocock/engineering/ask-matt/SKILL.md` ✅

## 改进提案

### 提案 1：vendor root 路径解析后 vendor skills 无法被 workflow 识别激活

- **类型**：`bug`
- **优先级**：`priority:critical`
- **领域**：`area:workflows`
- **根因**：WORKFLOW.md 声明 `vendor:matt-pocock` 根并映射到 `speculo/vendor/matt-pocock/`（通过 `workspace.json` 的 `vendor: "speculo/vendor"`），triage route 的 `<skill root="vendor:matt-pocock" .../>` 引用在规范层面路径正确、文件实际存在，但运行时 workflow 无法识别已安装的 vendor skills。根因可能为：(a) runtime-context skill 在解析 vendor root 时未正确执行存在性验证或路径拼接；(b) workflow 进入协议的 select-change/route 阶段在 skill 激活前未将 vendor root 纳入搜索范围；(c) path-resolution.md 规范中 vendor root 的边界检查规则不完整，导致即使路径正确也存在静默失败。
- **建议改动**：
  1. 审查 `speculo/skills/runtime-context/SKILL.md` 和 `references/path-resolution.md` 中 vendor root 的解析与验证逻辑，确保解析后的 vendor 路径经过存在性检查（目录存在且包含被引用的 SKILL.md）。
  2. 审查 `speculo/workflows/matt-pocock/WORKFLOW.md` 的进入协议 `<phase id="select-change">` 和 `<phase id="route">`，确保 vendor root 在 skill 激活前已正确初始化并可供 route 引用。
  3. 在 path-resolution.md 中明确 vendor root 的边界检查规则：解析后必须验证目标目录存在，否则返回明确错误（如 `vendor:matt-pocock root resolves to <path> but directory does not exist`），禁止静默跳过。
- **验收标准**：
  1. 当 `speculo/vendor/matt-pocock/engineering/triage/SKILL.md` 存在时，triage route 的 collect 阶段能成功激活该 skill。
  2. 当 vendor 目录缺失时，workflow 返回明确错误信息指明缺失路径，而非静默失败或提示"未安装"。
  3. 所有 10 条 route 中引用的 vendor skills 在对应文件存在时均可正常激活。
- **受影响资产**：
  - `speculo/workflows/matt-pocock/WORKFLOW.md`
  - `speculo/skills/runtime-context/SKILL.md`
  - `speculo/skills/runtime-context/references/path-resolution.md`
- **去重结论**：无重复 issue（已检索 `gh issue list --repo NAMEWTA/Speculo --search "vendor 路径"` 和 `--search "triage"`，均为空）。

## 丢弃与降级项

无。本次复盘仅发现一个明确的高优先级 bug，影响 workflow 核心功能（triage 路由不可用），无可合并或降级项。

## 目标仓库

`NAMEWTA/Speculo`（默认框架反馈上游）

## 用户确认记录

用户确认创建 issue，目标仓库 `NAMEWTA/Speculo`。

## 提交结果

| 提案 | Issue | 状态 |
|------|-------|------|
| vendor root 路径正确但 workflow 无法识别已安装的 vendor skills | [#17](https://github.com/NAMEWTA/Speculo/issues/17) | ✅ 已创建 |
