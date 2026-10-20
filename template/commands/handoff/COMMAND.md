---
id: handoff
description: Explicitly summarize the whole session and update each change's handoff for another agent or session to continue.
---

# 会话交接

仅在用户明确要求 handoff、交接或保存下一会话接续信息时调用。任务完成不自动调用；用户可以在工作中途停止、暂停或完成后执行。

1. 从当前目录向上寻找字面路径 `.agents/speculo/.speculo/workspace.json`。已安装时验证当前 schema、path_base 和 roots，再通过现有 resolver 解析绝对路径、读取 `<Path>{roots.config}</Path>`；不能确认根或 workspace 无效时只在会话说明缺失，不猜测写入位置、不初始化。配置缺失允许按共享交接默认方法只读准备，但说明缺口。按当前会话和用户范围定位真实对象、原 owner、当前负责工件及已存在的 handoff；不默认枚举全部历史。
2. 将用户请求、必要会话上下文、对象及生命周期、准确读写路径传给 <Path>{roots.references}/handoff/handoff-contract.md</Path>。由当前 Agent 或用户明确指定的 worker 执行；指定 worker 时经 <Path>{roots.references}/coordination/coordination-contract.md</Path> 派遣。
3. 单一可写 change 更新其 handoff.md；多 change 分别更新，并保存整体会话摘要和指针；无 change 或归档对象使用 <Path>{roots.state}/commands/handoff/{date}-{scope}-{topic}[-NN].md</Path>。规则、模板、领域恢复上下文和历史查询均由共享方法定义。
4. 回读每项结果，报告实际位置、更新范围和未完成项。部分失败逐项说明恢复入口。保持当前 owner 和业务状态，交接中的“已批准”不是新授权。

本命令拥有共享方法定义的会话报告位置和显式请求的 handoff.md 侧记写入，不创建 command state 或业务状态镜像。会话报告不覆盖；handoff.md 按共享流程核对原文和漂移后持续更新。未明确调用、只读或 plan 时只返回预览，不落盘。

## 消费交接

下一会话先按共享合同回读原 owner、TASK/REPORT、实际输入和候选写入，再执行唯一有依据且已授权的下一动作。worker 的 `completed` 只是候选交付；Lead 验收仍须独立核验。记录 unresolved writer 的对象不能因会话切换、长时间无更新或“已交接”而重派/接管，独立只读工作可继续。

需要核对最小真实消费流程时读取 [跨上下文消费示例](examples/README.md)。示例使用现有 TASK v2、REPORT 和 handoff Markdown，在新的进程中回读实际源文件、比较摘要并执行明确的只读检查；原 owner 和业务文件不变。它只证明这些输入能由独立消费者读取与核验，不把脚本检查当作另一模型理解、用户授权或 Lead 的最终验收。
