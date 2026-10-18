# Handoff：让另一个会话接得上

[手册首页](../README.md) · [Command 目录](README.md) · [源入口](../../template/commands/handoff/COMMAND.md)

在中途暂停、结束本轮或换 Agent 时，明确调用 handoff。任务完成不会自动调用；它核对已有成果与证据，保存背景、关键决定、最新情况、未完成事项和下一步。

```text
调用 command/handoff，总结整个会话，更新涉及 change 的 handoff.md。
保留当前背景和决定，指出已经验证的内容、剩余工作和下一安全动作。
```

| 会话范围 | 产物 |
|---|---|
| 一个未归档 change | 更新该 change 根目录的 handoff.md |
| 多个 change | 分别更新可写对象的 handoff.md，另保存整体会话摘要与指针 |
| 无 change、OPS 资源或归档对象 | 使用会话报告，引用真实对象，归档原件保持只读 |

会话报告位于 `roots.state/commands/handoff/YYYY-MM-DD-scope-topic[-NN].md`，冲突递增编号且不覆盖。每个 change 的 handoff.md 持续合并更新，保留有效背景、关键决定和用户补充，纠正过时结论时标明依据。

后续 Agent 先读最新 handoff，再核对原工件、owner、版本和未闭合动作。handoff 不是业务状态或新的授权；总结中会区分完成、未完成、自报和未验证，不自动执行余项或归档。写入前检查漂移，部分失败逐项说明恢复路径。

实现方法位于[共享 handoff reference](../../template/references/handoff/handoff-contract.md)，所有 workflow 和 Agent 都可在用户明确请求后调用；当前 Agent 默认执行，用户也可以指定 worker。派遣过程的 TASK/REPORT 是另一类任务输入与回报，详见[任务交接](../agent-handoffs.md)。
