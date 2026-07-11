# Speculo Matt-Pocock Workflow 资源

## Knowledge

- [WORKFLOW.md](../../../../workflows/matt-pocock/WORKFLOW.md) — 工作流主定义文件。包含运行时根、持久化命名空间、路由表、进入协议、依赖声明、状态扩展字段、状态转移规则。**本教学的核心文档。**
- [workspace.json](../../../../.speculo/workspace.json) — Speculo 项目根注册表。定义所有根别名（speculo、state、commands、skills、workflows、vendor）的路径映射。
- [routes/](../../../../workflows/matt-pocock/routes/) — 10 条路由定义文件。每条路由描述一个用户意图到 vendor skill 的映射关系。
- [vendor README.md](../../../../vendor/matt-pocock/README.md) — Matt Pocock 原始技能清单。列举了 engineering 和 productivity 两大领域的所有技能及其用途。
- [ask-matt SKILL.md](../../../../vendor/matt-pocock/engineering/ask-matt/SKILL.md) — 技能路由器。描述主流程（idea-to-delivery）、入口匝道（triage、diagnosing-bugs、wayfinder）、代码仓健康、底层词汇和独立技能的完整地图。
- [runtime-context SKILL.md](../../../../skills/runtime-context/SKILL.md) — 路径解析技能。向上定位 workspace.json，解析根别名，校验路径边界，返回统一的运行时上下文。
- [setup route](../../../../workflows/matt-pocock/routes/setup.md) — 懒配置路由。仅在目标路由缺少 tracker/triage/domain 配置时触发。
- [status.json](../../../../.speculo/matt-pocock/status.json) — 当前工作流状态实例。展示 current_route、route_history、current_change 的实际值。

## Wisdom (Communities)

- 暂无外部社区资源。该工作流是 Speculo 项目内部组件，智慧来自阅读源码和实践。
