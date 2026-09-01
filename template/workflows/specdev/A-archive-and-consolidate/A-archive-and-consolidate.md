---
id: specdev/archive-and-consolidate
type: workflow-entry
workflow: specdev
name: 归档与沉淀
description: 校验本地完成与远程 reconcile 门，复用全局归档能力移动 completed change 并提升当前知识，或从代码访谈形成可归档知识 change。
keywords: [归档, consolidation, ADR, context, research, knowledge, 代码库访谈]
---

# 归档与沉淀

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/specdev/README.md</Path>`，再执行本入口。

A 是 SpecDev 的归档 wrapper：它拥有模式选择、SpecDev 完成门和代码访谈；机械扫描、dry-run、知识毕业、合并、清理、移动与重读由 `<Path>{roots.skills}/archive-and-consolidate/SKILL.md</Path>` 单一维护。

## 模式

- **archive**：处理用户指定或唯一的 completed change。
- **consolidate-from-code**：用户明确要求从当前代码沉淀知识，或没有可归档 change；本次访谈本身创建一个 change，形成、验证、完成后再归档。

多个候选或模式冲突时请求消歧，不猜测。

## Archive 模式

1. 读取全局/change 状态、Ticket、Map、Goal Plan、Evidence、ADR、CONTEXT、LOG、triage 和项目验证事实。
2. 加载 `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>` 与 `<Path>{roots.workflows}/specdev/common/rules/parent-implementation-orchestration.md</Path>`，确认 `change_status: completed`、完成 owner 已写入时间和证据、无 blocker/deviation；若该 change 是未完成父实现 change 的成员则停止，若其自身是父实现 change 则还需所有成员与 aggregate Evidence 完成。
3. 检查 `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>` 的 `external_action`：`pending-close` 或 `close-failed` 返回 `<Path>{roots.workflows}/specdev/T-triage/T-triage.md</Path>`；只有 `closed | waived | not-applicable` 继续。
4. 调用 `<Path>{roots.skills}/archive-and-consolidate/SKILL.md</Path>` 的 `archive-single + dry-run`，传入已解析 workflow/state/changes/archive/knowledge roots。展示完整移动、提升和清理计划。
5. 只有用户明确批准该计划后调用 `confirmed`。移动、知识写入和清理均使用计划内路径；计划后出现 drift 时停止。
6. 重读源、归档目标、全局索引、归档 `<Path>{roots.state}/specdev/archive/YYYY-MM/{change}/.status.json</Path>` 和永久知识；运行 `--stage complete` 及包级校验，报告每个提升/跳过结论。

## Consolidate-from-code 模式

1. 创建 `<Path>{roots.state}/specdev/changes/{change}/</Path>`、change 状态、LOG、CONTEXT 和 ADR，并登记 `current_work`。
2. 加载 `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/consolidation-interview.md</Path>`，每轮先探索代码/配置/测试并陈述证据，再一次只问一个真正影响长期理解的问题。
3. 按 LOG → CONTEXT → ADR 顺序写入：CONTEXT 只保存项目规范术语；ADR 只有同时满足难逆转、令人意外和真实权衡时才创建。
4. 用户结论必须由当前代码或实际行为验证；未验证内容留在 LOG，不提升。
5. 按 change completion 规则由本 Work 关闭该非实现型 change，再进入 Archive 模式的 dry-run/确认流程。

## 副作用

Dry-run 不修改文件。归档移动、知识 merge/rewrite/delete、Git 动作均在计划展示后单独确认。归档目录完成后只读；后续纠正通过新 change 和 supersedes 链完成。

## 完成标准

- 模式与唯一 change 已确定；
- 本地完成和 external reconcile 门通过；
- 机械归档与知识规则只有全局 skill 一个事实源；
- dry-run 与 confirmed 执行严格分离；
- 源不存在、目标完整、active/archived 无重叠、归档状态正确；
- 永久知识只包含当前、跨 change 有用且有实现证据的结论；
- 无未批准移动、删除、改写或 Git 副作用。

## 子文件引用

- 全局归档 Skill：`<Path>{roots.skills}/archive-and-consolidate/SKILL.md</Path>`
- Change 完成：`<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>`
- 代码访谈：`<Path>{roots.workflows}/specdev/A-archive-and-consolidate/consolidation-interview.md</Path>`
