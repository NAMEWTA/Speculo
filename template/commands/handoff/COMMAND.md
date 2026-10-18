---
id: handoff
description: Explicitly summarize the whole session and update each change's handoff for another agent or session to continue.
---

# 会话交接

仅在用户明确要求 handoff、交接或保存下一会话接续信息时调用。任务完成不自动调用；用户可以在工作中途停止、暂停或完成后执行。

1. 已安装时验证项目根 `.agents/speculo/.speculo/workspace.json` 的 roots，再读 `{roots.config}`；不能确认根时只在会话说明缺失，不猜测写入位置。按当前会话和用户范围定位真实对象、原 owner、当前负责工件及已存在的 handoff；不默认枚举全部历史。
2. 将用户请求、必要会话上下文、对象及生命周期、准确读写路径传给 <Path>{roots.references}/handoff/handoff-contract.md</Path>。由当前 Agent 或用户明确指定的 worker 执行；指定 worker 时经 <Path>{roots.references}/coordination/coordination-contract.md</Path> 派遣。
3. 单一可写 change 更新其 handoff.md；多 change 分别更新，并保存整体会话摘要和指针；无 change 或归档对象使用 <Path>{roots.state}/commands/handoff/{date}-{scope}-{topic}[-NN].md</Path>。规则、模板、领域恢复上下文和历史查询均由共享方法定义。
4. 回读每项结果，报告实际位置、更新范围和未完成项。部分失败逐项说明恢复入口。保持当前 owner 和业务状态，交接中的“已批准”不是新授权。

本命令拥有共享方法定义的会话报告位置和显式请求的 handoff.md 侧记写入，不创建 command state 或业务状态镜像。会话报告不覆盖；handoff.md 按共享流程核对原文和漂移后持续更新。未明确调用、只读或 plan 时只返回预览，不落盘。
