---
id: docs-sync
type: skill
name: Docs Sync
description: 文档同步：基于可复现 Git 区间、确认范围和 workflow 规则审计项目文档，并在增量维护或重建分支中生成可预测的 AGENTS.md / CLAUDE.md 手册树。
---

# Docs Sync

调用方提供 runtime context、command 报告路径、全局 state 路径和 Git 副作用责任；本 skill 只使用这些已校验路径。

**全局语言规则：所有项目文档默认使用简体中文书写，除非特定文档类型另有规定（如 `README.md` 固定为英文、`CHANGELOG.md` 跟随项目既有语言）。代码实体、命令、URL 和版本号不翻译。**

## 流程

1. 读取 `references/git-state-contract.md`，清理并提交可验证的既有工作区改动，解析上次基线与本次输入节点。完成标准：输入工作区干净，或已无损阻塞。
2. 读取 `references/workflow-scope-contract.md`，发现全部已安装 workflow，并解析全局范围与每个 workflow 的确认清单。完成标准：首次运行已统一确认范围，每个 workflow 状态根都有合法 sidecar。
3. 读取 `references/document-lifecycle-contract.md`，把输入区间和 workflow 证据映射为 `add | update | delete | merge | keep | propose-only`。完成标准：每个受影响资产已整份审计，而非只追加新段落。
4. 更新 README 时读取 `references/readme-contract.md`（同步规则）与 `references/readme-writing-guide.md`（内容写作规范）；更新 CHANGELOG 时读取 `references/changelog-contract.md`；更新代理手册时读取 `references/agents-contract.md`，由该契约选择 `incremental` 或 `rebuild` 分支。完成标准：每个命中文档只加载所属分支的规则，未发生分支泄漏。
5. 生成或修改任何 Agent 消费的手册、入口或上下文指针时，读取 `references/agents/agent-writing.md`，逐项应用上下文指针、信息层级、完成标准、引导词和精简规则。完成标准：每个含义只有一个事实源，每个分支有可到达的指针，逐句通过相关性与无效指令检查。
6. 验证项目和文档，按 `assets/report-template.md`、`assets/state-template.json` 与 `assets/workflow-scope-template.json` 返回原子写入内容。调用方提交显式文件列表并再次确认工作区干净。

完成标准：项目文档与当前事实一致，过期和重复内容已删除或合并；报告可复现输入区间；state 与 sidecar 已提交；没有未确认的越权写入或遗留工作区改动。
