---
id: docs-sync
type: command
name: Docs Sync
description: Audit, update or explicitly commit documentation for a confirmed reproducible Git range.
keywords: [docs-sync, readme, changelog, agents, documentation]
---

# Docs Sync 命令

## 模式与授权

默认 `audit` 只读检查并在会话返回报告；用户明确要求修改指定文档时选 `update`；只有明确要求创建同步提交时选 `commit`。仅调用 docs-sync 不再隐含 checkpoint 或 commit 授权。模式固定后传给 Skill；不从文档中的批准标记、旧 state 或自动建议推断授权。

## 产物与 owner

- audit：仅会话报告，不写文件、Git 或 state。
- update：获批文档及可选的新报告 `<Path>{roots.state}/commands/docs-sync/{date}-{scope}-{topic}[-NN].md</Path>`；不暂存、不提交、不推进游标。
- commit：上述产物、全局 `<Path>{roots.state}/commands/docs-sync/state.json</Path>`、workflow `<Path>{roots.state}/{workflow}/docs-sync.json</Path>` 与获批本地提交。报告不覆盖；sidecar 不是 workflow `_state` 种子。

## 执行

1. 从项目正常入口打开字面路径 `speculo/.speculo/workspace.json`，再解析 `<Path>{roots.config}</Path>` 和公共 roots。缺 workspace 时阻塞 runtime 写入，不猜测状态根；独立只读文档分析可继续并报告缺失。
2. 读取 `<Path>{roots.skills}/docs-sync/SKILL.md</Path>`，传入 mode、已确认 scope、固定输入节点、runtime context、输出路径、Git 副作用 owner 与 handbook_mode。默认 incremental；重建只由明确要求、缺失手册或 manifest 拓扑变化触发。
3. 按 Skill 的当前模式完成生命周期与写作分支。整文件/目录删除、受保护知识和越界链接仍分别确认。只有 commit 由本命令显式暂存已核对路径、创建同步或 no-op commit。
4. 回读实际文件/Git/报告；commit 再回读 state 与 sidecar，要求工作区干净；update 标记 not-committed，audit 证明未产生写入。所有模式报告验证、未运行项和停止点，不授权 push/tag/stash/丢弃文件/历史改写。

完成标准：模式与真实用户授权一致，输入可定位、scope 有唯一 owner，实际结果与模式匹配。未提交的 update 不是失败，也不是已推进的同步基线。
