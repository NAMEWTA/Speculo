# Coordination Init：项目默认编排偏好

[手册首页](../README.md) · [Command 目录](README.md) · [源入口](../../template/commands/coordination-init/COMMAND.md)

所有 workflow 共用这个初始化入口。安装并曝光 `command/coordination-init` 后，明确让 AI 调用；安装和发现入口本身不会执行初始化。

```text
调用 command/coordination-init，将项目默认编排偏好设为 Herdr，
使用项目 .agents/skills/ 中的入口。
```

没有已有选择时，从当前宿主、CLI、Herdr、Orca 中选择一个默认方式；建议当前宿主（`host`）。Herdr/Orca 再明确项目 Skill 位置；CLI 可选保存工具和 `interaction: headless | interactive`，当次要求可覆盖。有效偏好直接复用，明确要求更改时才更新。取消或只读/plan 不写文件。配置保存在 `roots.state/coordination/project.json`，保留已有有效规则。

初始化只设置默认方式并检查相关入口。Skill 缺失时按提示在 `speculo init` 的 SKILLS-HUB 中安装；初始化不启动服务或派遣业务任务。运行时外部偏好不可用，可按保存的 fallback 回到当前宿主；当次强制指定的方式不能静默替换。

当前编排配置使用 schema v2。v1 配置不会被读取或自动迁移，包括 Herdr/Orca 偏好。恢复时先将原 `project.json` 备份到不会覆盖既有文件的位置，核对其默认值、回退与 Work/阶段规则；由用户自行替换原路径为所需的 v2 配置，或另行明确授权处理。检查 v2 模式与回退使用 `host`，然后运行 `speculo doctor` 复核。安装刷新不会转换或删除运行时配置。

例如，明确选择 CLI 并保存无头偏好：

```json
{
  "schema_version": 2,
  "defaults": {
    "mode": "cli",
    "selection": "preferred",
    "tool": "用户选择的 AI CLI",
    "interaction": "headless",
    "fallback": ["host"]
  },
  "rules": []
}
```

`tool` 和 `interaction` 均可省略；实际派遣前仍须确定工具及调用方式，并按该 CLI 当前接口检查。

当次请求可以指定工具、模型和顺序，例如：

```text
请指定 Codex 的模型生成计划，再让 Grok 的模型生成票据和地图；
实现后派一个 Agent 调用 Learning 讲解当前情况，最后交给 PI 审查。
```

工具和模型需在实际环境中可用。Worker 可以直接写入获分配的文档或代码，Lead 核验后协调原领域 owner 更新状态。详见[通用编排与任务交接](../agent-handoffs.md)。需要交接整个会话时另行明确调用 [handoff](handoff.md)。


默认偏好不等于强制派遣。主 Agent 先判断直接完成、普通工具并行或独立执行者，再在当前授权与 required 约束内选通道；没有 project.json 也能正常执行。可选 allowed_modes 只收窄项目候选范围，不授予安装、登录、远程写入、付费或权限绕过。
