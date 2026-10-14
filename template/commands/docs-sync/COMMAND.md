---
id: docs-sync
description: 用户手动触发的一次全局文档盘点、整理与管理；按授权审计、更新或提交本次目标。
---

# Docs Sync

本命令管理项目文档、AGENTS、项目 Skills 与指令资源；Git diff 提供变化线索，不限制全局盘点。普通开发任务不自动触发本命令，也不借文档整理执行业务、归档或发布。

## 模式与 owner

- `audit`（默认）：会话报告，零文件、Git 或 state 写入。
- `update`：用户已要求整理或修改文档，更新授权范围及可选新报告；不暂存、不提交、不推进游标。
- `commit`：用户明确要求提交本次文档整理，完成更新并仅提交获批目标及必要报告/state。提交不授权 push、tag、stash、清理或历史改写。

同一具体授权由本命令核对并复用；全局分析范围不等于全局写入权限。整文件删除、受保护知识和范围外目标需要相应明确授权，已有覆盖该动作的批准不重复询问。

## 执行

1. 定位项目根及 Git HEAD；需要 runtime 时从项目入口字面路径 `.agents/speculo/.speculo/workspace.json` 解析 roots，再按需读 `<Path>{roots.config}</Path>`。workspace 缺失仅阻塞 runtime 写入，独立审计和获批项目文档编辑继续。
2. 读取 `<Path>{roots.commands}/docs-sync/references/operation-contract.md</Path>`，传入 mode、项目根、固定输入节点、已有授权和文档 owner，完成全局盘点、处置及验证。
3. 本命令拥有报告 `<Path>{roots.state}/commands/docs-sync/{date}-{scope}-{topic}[-NN].md</Path>`；从 `-01` 选最小未用编号，原子写入且不覆盖。只有 commit 使用 `<Path>{roots.state}/commands/docs-sync/state.json</Path>` 和实际纳管 workflow 的 `<Path>{roots.state}/{workflow}/docs-sync.json</Path>`，sidecar 不属于 workflow `_state` 种子。
4. 回读实际结果。audit 返回发现，update 标记 `not-committed`，commit 验证本次提交和无关工作区/暂存内容保持不变。没有实质内容、范围或基线变化时返回 `no-op`，不为运行次数或报告制造提交。

完成标准：全局清单中的每个目标有结论，获批动作完成并验证，未授权候选和阻塞有明确 owner/下一步；仅完整完成的同步范围可推进基线。局部阻塞不停止独立且已授权的工作。
