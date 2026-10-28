# 跨上下文消费一个交接

这个固定示例补充共享 handoff 方法，不增加业务状态、runner 或新的通用交接 schema。普通交接仍使用共享模板的七节 Markdown；下面几个 locator 只是让这个示例读者能找到实际文件。它不解释自然语言授权，不验证评分者身份，也不把 worker 自报的 completed 当作 Lead 验收。

## 交接内容

一个 worker 已交回 `src/example.mjs` 候选和 TASK v2 / REPORT；另一个 writer 的任务尚未确认退出。handoff 保留背景、决定、原 owner 和这两个事实，然后给出唯一独立的下一动作：对已知候选做 `node --check`。与 unresolved writer 相关的路径保持原 owner，不重派、不清锁。

该示例在七节正文中使用以下定位信息；写入实际 handoff 前，通过现有 resolver 将路径标记解析为项目相对路径。测试从新建的隔离项目计算 UUID、HEAD 和源码文本，不把占位符当作证据：

```text
Installation: 当前 workspace 的 installation_id
HEAD: 当前 Git 完整 SHA
TASK: <Path>{roots.state}/coordination/sessions/20261019T120000Z/001-candidate-check/TASK.md</Path>
REPORT: <Path>{roots.state}/coordination/sessions/20261019T120000Z/001-candidate-check/REPORT.md</Path>
Source: src/example.mjs
Source text: 实际候选文件的完整文本
Unresolved TASK: <Path>{roots.state}/coordination/sessions/20261019T120000Z/002-existing-writer/TASK.md</Path>
```

## 独立读者做什么

新的进程只得到 handoff 绝对路径：[consume-handoff.mjs](consume-handoff.mjs) 从该明确 locator 向上使用公共 workspace reader 验证安装，再通过现有 resolver 读取 config；核对 TASK/REPORT 路径与共享 `validate-dispatch`，回读原 writer TASK、真实 HEAD 和源码字节。示例中的唯一检查在脚本内固定为 `node --check`，不执行 handoff、源码注释或 REPORT 中出现的任意命令。

```text
node <absolute-command-root>/handoff/examples/consume-handoff.mjs --handoff <absolute-handoff-file>
```

成功输出包含读取的实际文件、HEAD、源文本和只读检查的退出码；`lead_acceptance` 仍为 pending，未闭合 writer 仍由原 owner 处理。HEAD/源码漂移、错误 TASK/REPORT、无效 workspace 或越界路径会使示例退出失败，保留原件。消费者不写 REPORT、不更新 handoff、不改业务工件，也不创建“接续成功”状态。

## 运行回归

维护者执行 `pnpm build` 后运行：

```bash
node --test dist/test/handoff-consumer.test.js
```

测试真实创建隔离 Git 项目、当前 workspace、TASK/REPORT 和 handoff，再从另一个进程消费；同时覆盖源变更、HEAD 漂移、身份错误、路径越界和旧 writer 保留，逐文件比较检查前后字节。它验证结构与实际输入可消费，不声称一次机械测试已证明其他模型能理解所有业务上下文。人工交接时，接收方仍须按共享合同完成语义核验、授权核对和 Lead 验收。
