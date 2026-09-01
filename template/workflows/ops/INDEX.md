---
id: ops
type: workflow
workflow: ops
name: Ops Workflow
description: 以项目或全局 change 约束部署评估、批量批准、迭代执行、验证复盘和长期运维知识沉淀。
keywords: [ops, 运维, 部署, 项目归档, 实施计划, 复盘, SOP]
---

# Ops Index

本索引用于发现 Ops，并让未激活状态机的会话按需读取已经验证的全局或项目运维知识。瞬时系统状态、失败现场和执行日志只存在于归档 change，不作为永久真相。

## 永久知识

只读取当前请求需要且实际存在的索引或知识文件；路径不存在时静默跳过。被动读取不得初始化 Ops、读取 active change、执行系统探测或修改状态：

- 全局上下文：`<Path>{roots.state}/ops/context/</Path>`
- 全局运维决策：`<Path>{roots.state}/ops/adr/</Path>`
- 全局 runbook：`<Path>{roots.state}/ops/runbooks/</Path>`
- 项目身份：`<Path>{roots.state}/ops/projects/{project_id}/project.json</Path>`
- 项目上下文：`<Path>{roots.state}/ops/projects/{project_id}/context/</Path>`
- 项目运维决策：`<Path>{roots.state}/ops/projects/{project_id}/adr/</Path>`
- 项目 SOP 与排障说明：`<Path>{roots.state}/ops/projects/{project_id}/runbooks/</Path>`

永久知识只保存仍然有效、具有 change 证据且标明最后验证时间的结论。PID、容器 ID、即时占用、一次性错误输出和当前进程状态必须回到对应归档 change 核对。

## Work 激活

用户明确激活 Ops 或其中某个 Work 后，读取 `<Path>{roots.workflows}/ops/README.md</Path>`，取得 scope/project/change 选择、状态、工件所有权、批准、迭代执行、复盘提升和归档合同。仅发现本索引或读取永久知识不加载该合同。
