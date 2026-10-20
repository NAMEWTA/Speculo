# Coordination Init：项目默认编排方式

[手册首页](../README.md) · [Command 目录](README.md) · [源入口](../../template/commands/coordination-init/COMMAND.md)

所有 workflow 共用这个初始化入口。安装并曝光 `command/coordination-init` 后，明确让 AI 调用；安装和发现入口本身不会执行初始化。

```text
调用 command/coordination-init，将项目默认编排方式设为 Herdr，
使用项目 .agents/skills/ 中的入口。
```

没有已有选择时，从 Herdr、Orca、CLI、当前宿主中选择一个默认方式。Herdr/Orca 再明确项目 Skill 位置；有效偏好直接复用，明确要求更改时才更新。取消或只读/plan 不写文件。配置保存在 `roots.state/coordination/project.json`，保留已有有效规则。

初始化只设置默认方式并检查相关入口。Skill 缺失时按提示在 `speculo init` 的 SKILLS-HUB 中安装；初始化不启动服务或派遣业务任务。运行时外部偏好不可用，可按保存的 fallback 回到当前宿主；当次强制指定的方式不能静默替换。

具体工具、模型和顺序由每次请求决定，例如：

```text
请指定 Codex 的模型生成计划，再让 Grok 的模型生成票据和地图；
实现后派一个 Agent 调用 Learning 讲解当前情况，最后交给 PI 审查。
```

工具和模型需在实际环境中可用。Worker 可以直接写入获分配的文档或代码，Lead 核验后协调原领域 owner 更新状态。详见[通用编排与任务交接](../agent-handoffs.md)。需要交接整个会话时另行明确调用 [handoff](handoff.md)。
