---
id: docs-sync
type: skill
name: Docs Sync
description: 基于可复现 Git 区间、用户确认范围和 workflow 规则，清洁工作区并全量审计同步项目文档与知识资产。
---

# Docs Sync

调用方提供 runtime context、command 报告路径、全局 state 路径和 Git 副作用责任；本 skill 只使用这些已校验路径。

## 流程

1. 读取 `references/git-state-contract.md`，清理并提交可验证的既有工作区改动，解析上次基线与本次输入节点。完成标准：输入工作区干净，或已无损阻塞。
2. 读取 `references/workflow-scope-contract.md`，发现全部已安装 workflow，并解析全局范围与每个 workflow 的确认清单。完成标准：首次运行已统一确认范围，每个 workflow 状态根都有合法 sidecar。
3. 读取 `references/document-lifecycle-contract.md`，把输入区间和 workflow 证据映射为 `add | update | delete | merge | keep | propose-only`。完成标准：每个受影响资产已整份审计，而非只追加新段落。
4. 更新 README 时读取 `references/readme-contract.md`；更新 CHANGELOG 时读取 `references/changelog-contract.md`；更新代理手册时读取 `references/agents-contract.md`。需要创建或重建多层代理手册树时改用 `../agents-md-builder/SKILL.md`。
5. 验证项目和文档，按 `assets/report-template.md`、`assets/state-template.json` 与 `assets/workflow-scope-template.json` 返回原子写入内容。调用方提交显式文件列表并再次确认工作区干净。

完成标准：项目文档与当前事实一致，过期和重复内容已删除或合并；报告可复现输入区间；state 与 sidecar 已提交；没有未确认的越权写入或遗留工作区改动。
