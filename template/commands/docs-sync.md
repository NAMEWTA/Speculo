---
id: docs-sync
type: command
name: Docs Sync
description: 清洁并提交工作区，以可复现 Git 区间和确认范围同步项目文档与 workflow 知识
keywords: [docs-sync, readme, changelog, agents, documentation]
---

# Docs Sync 命令

## 产物

- 报告：`speculo/.speculo/commands/docs-sync/<YYYY-MM-DD>-<scope>-<topic>[-NN].md`
- 全局 state：`speculo/.speculo/commands/docs-sync/state.json`
- Workflow 范围：`speculo/.speculo/<workflow>/docs-sync.json`

调用本命令即授权它在校验通过后创建本地 checkpoint 与文档同步 commit；不授权 push、tag、stash、历史改写或丢弃文件。

## 执行

1. 读取 `../skills/runtime-context/SKILL.md` 与 `../skills/docs-sync/SKILL.md`，解析 command 路径、`speculo/config.json`（不存在时以默认值静默降级）和全部已安装 workflow/state 根。
2. 按 skill 的 Git 契约检查 tracked、staged、unstaged 与 untracked 内容；安全且校验通过时显式暂存并创建 checkpoint，异常时无损阻塞。
3. 读取全局 state、各 `WORKFLOW.md`、同级 `PERSISTENCE.md` 和 sidecar。首次运行统一展示全局与每个 workflow 的候选范围；用户确认后为所有已安装 workflow 创建 sidecar，空范围也保留。
4. 由 skill 收集精确 commit 区间、archive 与声明 store 证据，整份审计命中文档并执行新增、更新、删除段落、合并或保留。整文件/目录删除和受保护知识仍逐次确认。
5. 运行项目与文档校验，原子写入报告、state 和 sidecar，再显式暂存本次产物并创建同步或 no-op commit。
6. 重新读取 Git、state、报告与 sidecar；只有工作区干净、节点可复现且所有文件已提交时完成。

完成标准：报告含输入节点、checkpoint、确认范围、生命周期动作和验证；全局 state 与每个 workflow sidecar 有效；`git status --short` 为空。
