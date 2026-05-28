# Speculo workflows/{dev,ops}/ 覆盖率快照

> 生成时间：2026-05-29T09:30:00Z
> 任务参考：基于 6 个 `temp/project/` 框架的开发建设结果
> 关联文档：[`inspiration-trace.md`](./inspiration-trace.md)（借鉴对照表）

## dev/ 覆盖矩阵

| Phase | 入口文件 | 子规范数 | 模板数 | 字段填充率 | 主要借鉴来源 |
|-------|---------|---------|--------|-----------|------------|
| 01-prd | 01-prd.md (64 lines) | 2 (prd-core, prd-review) | 2 (prd, prd-review) | 100% | spec-kit/templates/spec-template.md, flow-kit/templates/REQUIREMENT.md |
| 02-design | 02-design.md (63 lines) | 2 (design-arch, design-api) | 2 (design-arch, design-api) | 100% | spec-kit/templates/plan-template.md, flow-kit/templates/DESIGN.md |
| 03-implement | 03-implement.md (63 lines) | 2 (implement-core, implement-checklist) | 2 (plan, implement) | 100% | flow-kit/RULES.md (R4/R6/R7), spec-kit/templates/tasks-template.md, oh-my-claudecode/CLAUDE.md (Git Trailer) |
| 04-test | 04-test.md (65 lines) | 2 (test-unit, test-e2e) | 2 (test-unit, test-e2e) | 100% | flow-kit/templates/TEST.md（5 轮金字塔）, spec-kit Constitution III（TDD） |
| 05-review | 05-review.md (69 lines) | 2 (review-code, review-security) | 2 (review-code, review-security) | 100% | flow-kit/templates/REVIEW.md（双轮）, gstack/cso/SKILL.md（OWASP）, oh-my-claudecode/CLAUDE.md（写作/审查通道分离） |
| 06-handoff (新增) | 06-handoff.md (52 lines) | 1 (handoff-changelog) | 1 (handoff) | 100% | OpenSpec changes（propose→archive）, gstack/document-release/SKILL.md |

## ops/ 覆盖矩阵

| Phase | 入口文件 | 子规范数 | 模板数 | 字段填充率 | 主要借鉴来源 |
|-------|---------|---------|--------|-----------|------------|
| 01-release | 01-release.md (55 lines) | 1 (release-checklist) | 1 (release) | 100% | gstack/ship/SKILL.md, flow-kit/RULES.md (R4.4 verify 输出) |
| 02-deploy | 02-deploy.md (70 lines) | 2 (deploy-execute, deploy-rollback) | 2 (deploy, deploy-rollback) | 100% | gstack/land-and-deploy/SKILL.md, flow-kit/RULES.md (R4.5 schema 可逆迁移) |
| 03-monitor (新增) | 03-monitor.md (56 lines) | 1 (monitor-checklist) | 1 (monitor) | 100% | gstack/canary/SKILL.md, flow-kit/prompts/M-health.md |
| 04-incident (新增) | 04-incident.md (58 lines) | 1 (incident-response) | 1 (incident) | 100% | flow-kit/prompts/M-health.md, gstack/investigate/SKILL.md |
| 05-postmortem (新增) | 05-postmortem.md (57 lines) | 1 (postmortem-checklist) | 1 (postmortem) | 100% | gstack/retro/SKILL.md, flow-kit/templates/LESSONS.md |

## 验收清单逐项

| D | 描述 | 状态 | 证据命令 |
|---|------|------|---------|
| D1 | inspiration-trace 30+ 条目 | ✅ | `grep -c '^\| temp/project/' docs/inspiration-trace.md` = 57 |
| D2 | dev/ TODO 清零 | ✅ | `grep -rEn "\[TODO\]" framework/workflows/dev/ \| grep -v _templates/` = 0 行 |
| D3 | ops/ TODO 清零 | ✅ | `grep -rEn "\[TODO\]" framework/workflows/ops/ \| grep -v _templates/` = 0 行 |
| D4 | frontmatter v2.1 合规 | ✅ | `grep -rE "^(phases\|template\|uses_skills\|depends_on\|status_extensions):" framework/workflows/{dev,ops}/` = 0 行 |
| D5 | frontmatter 4-5 字段齐全 | ✅ | 每个 phase 入口含 `id` / `category` / `name` / `description`（可选 `keywords`） |
| D6 | 正文四章节齐全 | ✅ | 每个 phase 入口含 `## 阶段` / `## 依赖` / `## 状态扩展字段` / `## 完成与状态更新` 四级标题 |
| D7 | 相对路径合规 | ✅ | `grep -rEn '\]\((/[a-z]\|/Users/)' framework/workflows/{dev,ops}/` = 0 行 |
| D8 | dev ≥6 phase + ops ≥5 phase | ✅ | `ls -d framework/workflows/dev/[0-9]*` = 7（含 00-INDEX.md），`ls -d framework/workflows/ops/[0-9]*` = 6（含 00-INDEX.md） |
| D9 | 冒烟 .status.json 可解析 | ✅ | `python3 -c "import json,glob; [json.load(open(p)) for p in glob.glob('framework/.speculo/{dev,ops}/2026-05-28-smoke-*/.status.json')]"` 退出码 0；含 8 元字段（≥6 强制） |
| D10 | coverage-snapshot.md 存在含 ≥11 行表格 | ✅ | 本文件 dev 6 行 + ops 5 行 = 11 行覆盖矩阵 |

## 偏离与待办

### 偏离原计划

- **偏离 1**：Phase D 选择 `dev/06-handoff` 而非另起独立 `dev/07-archive`。理由：归档动作由 `commands/archive.md` 强制用户确认触发，不适合做成 phase；handoff 收尾时仅置 `archive_ready=true` 占位即可。
- **偏离 2**：`ops/02-deploy` 原骨架 Phase 1 的"规范"字段标 `[TODO 创建独立 phase 文件]`，本次新建了 `deploy-execute.md` 作为对应子规范（命名遵循 C5 `<name>-<phase>.md` 约定）。这是必须的偏离，否则 02-deploy.md 入口的相对路径引用悬空。
- **偏离 3**：`05-postmortem` 把"复盘"作为单 phase 而非拆"会议 + 写报告 + 写回 LESSONS"三 phase。理由：复盘是单次产出，强行拆 phase 会增加状态机复杂度而不增价值；写回 LESSONS 在"完成与状态更新"段强制即可。
- **偏离 4**：`ops/04-incident` 把严重度分级、止损、根因合并到单 `Triage` phase。理由：事故场景"时间紧、信息少"，多 phase 切换增加上下文成本；复盘留给 `05-postmortem` 是合理的"先止损后反思"切分。

### 待办

- **待办 1**：`framework/workflows/doc/` 的子规范文件（如 `readme-structure.md` / `changelog-format.md` / `api-doc-*.md`）仍有 `[TODO: 引导]` 占位，未在本任务 Scope 内处理。建议下次扩展任务覆盖 doc/ 工作流并对齐 dev/ops 的填充水位。
- **待办 2**：`framework/.speculo/.config/*.example` 的 example 文件（如 `RULES.md.example`）保持骨架（含 `[TODO: ...]` 提示），这是有意的——这些是用户激活后填写的样例；未来可补一份"已填充的 example 样例"放 `examples/` 子目录展示完整效果。
- **待办 3**：本次未为 `framework/commands/` 类构件做端到端冒烟（如 `commands/archive.md` 的实际归档冒烟）。建议下次任务覆盖 commands/ 的产物冒烟。
- **待办 4**：`README.md` 仍写"版本 v2.0"，与 `docs/Speculo-architecture.md` 的 "v2.1" 标识不一致；属于 Scope 外的只读区域，未动；建议下次任务由用户或独立 PR 同步。
- **待办 5**：`ops/05-postmortem/` 的"RULES.md 修订建议"写入 `LESSONS.md` 末尾的约定，依赖 `LESSONS.md` 内部分段结构；本次仅在文档中描述，未在 `.config/LESSONS.md.example` 内预置该段；建议后续在 example 中预置 "## RULES.md 修订建议" 占位段。

## 状态自检：D 条全过总览

| 阶段 | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 |
|------|----|----|----|----|----|----|----|----|----|-----|
| Phase A | ✅ | — | — | — | — | — | — | — | — | — |
| Phase B | — | ✅ | — | ✅ | ✅ | ✅ | ✅ | partial | — | — |
| Phase C | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | partial | — | — |
| Phase D | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| Phase E | — | — | — | — | — | — | — | — | ✅ | — |
| Phase F | — | — | — | — | — | — | — | — | — | ✅ |
| **总计** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

全部 D1-D10 通过；满足 Done when 完整集合。
