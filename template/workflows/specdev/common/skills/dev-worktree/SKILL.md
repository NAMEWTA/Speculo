---
name: dev-worktree
description: 为 SpecDev change 创建、复用、恢复和核验一个选定 Git worktree；仅在 change 明确选择独立工作区或授权清理时使用。
compatibility: Requires the owning Speculo workflow and its workspace path resolver.
---

# Dev Worktree

由 P-goal-plan 和 I-implement 复用；T 只规划并引用工作区选择。按 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path>，一个 change 的全部票据与协作者使用同一工作区；current 不创建 worktree。

## 输入

- `operation=create | restore | finalize | remove`，`purpose=change`；
- 已授权 change、Spec/实际 Ticket、项目根、基线、选定 branch/workspace；
- 原 owner、授权写集、验证合同、原 README/Evidence；
- 创建或删除的具体授权；创建不要求预先授权 commit/merge。

## 创建或恢复

create/restore 读取 <Path>{roots.workflows}/specdev/common/skills/dev-worktree/references/create.md</Path>。先检查已有记录和实际 Git，精确匹配则复用。没有指定名称的新 change worktree 使用 `specdev-worktree/<change>` 和 `speculo/<change>`；不按 Ticket、Agent、重试或审查拆分目录。

**完成标准**：唯一 workspace/branch/base 与真实 Git 和原授权一致，未覆盖用户改动。

## 核验

finalize 读取 <Path>{roots.workflows}/specdev/common/skills/dev-worktree/references/finalize.md</Path>。它只验收选定工作区，不创建 candidate checkout、不合并或推进其他分支。每票和整个 change 通过各自 AC、风险适配双轴审查及验证门。

## 授权清理

remove 只在明确授权的精确目标上执行：writer 已停止、工作区 clean、未提交产物已另有可恢复处置，已承诺交付完成或获明确处置。先核验真实 Git，再删除并重读 worktree list/refs；保留全部 Evidence。强制删除需专门授权，不能因 done 自动清理。

清理前完成仍需读取该工作区的父完成和归档验收。若用户明确要求提前删除，保留原上下文、可恢复 checkpoint 和尚未验收事项；相关验收保持阻塞，恢复时只重建原选定工作区，不能将不存在的工作区当作已核验交付。

**完成标准**：只处理授权的 change 工作区，失败保留现场和下一步。push、PR、merge、部署和永久知识写入仍属于原 owning 入口。
