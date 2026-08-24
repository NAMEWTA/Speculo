---
id: docs-sync
type: command
name: Docs Sync
description: 清洁并提交工作区，以可复现 Git 区间和确认范围同步项目文档、Agent 手册与 workflow 知识
keywords: [docs-sync, readme, changelog, agents, documentation]
---

# Docs Sync 命令

## 产物

- 报告：`<Path>{roots.state}/commands/docs-sync/{date}-{scope}-{topic}[-NN].md</Path>`
- 全局 state：`<Path>{roots.state}/commands/docs-sync/state.json</Path>`
- Workflow 范围：`<Path>{roots.state}/{workflow}/docs-sync.json</Path>`

调用本命令即授权它在校验通过后创建本地 checkpoint 与文档同步 commit；不授权 push、tag、stash、历史改写或丢弃文件。

## 执行

1. 读取 `<Path>{roots.skills}/docs-sync/SKILL.md</Path>`，解析 `<Path>{roots.config}</Path>` 与 `<Path>{roots.state}/workspace.json</Path>`（不存在时以默认值静默降级），获取全部已安装 workflow/state 根。
2. 将 runtime context、报告路径、全局 state 路径、Git 副作用责任和 `handbook_mode` 传给 skill。`handbook_mode` 默认为 `incremental`；用户明确要求、手册缺失或 manifest 拓扑变化时使用 `rebuild`。
3. 整文件/目录删除和受保护知识仍逐次确认；skill 返回原子写入内容后，由本命令显式暂存并创建同步或 no-op commit。
4. 重新读取 Git、state、报告与 sidecar；只有工作区干净、节点可复现且所有文件已提交时完成。

完成标准：报告含输入节点、checkpoint、确认范围、handbook mode、生命周期动作和验证；全局 state 与每个 workflow sidecar 有效；`git status --short` 为空。
