---
id: coordination-init
description: Explicitly initialize or update the project's optional agent coordination preference for every workflow.
---

# 项目编排初始化

用户明确调用本 Command 时，配置所有 workflow 共用的一个可选默认编排偏好；安装或发现入口不触发初始化。用户可以指定方式、项目 Skill 目录、CLI 工具与调用偏好、只读/plan，或明确更改已有默认值。该偏好不强制委派；是否派发、人数与通道由主 Agent 在当前用户约束和授权内判断。任务顺序与技能组合留给当次目标。

1. 从项目根字面路径 `.agents/speculo/.speculo/workspace.json` 验证 workspace 和 roots，再读 `{roots.config}`；缺少安装时提示运行 `speculo init`，不猜测写入根。确认当前项目与写入 owner、安装事务和锁无冲突。
2. 按 <Path>{roots.references}/coordination/initialization.md</Path> 校验并复用已有选择；首次选择当前宿主 / CLI / Herdr / Orca 之一，当前宿主为默认建议。未回答或取消不写入选择。
3. 由本 Command 唯一管理 <Path>{roots.state}/coordination/project.json</Path> 的默认偏好写入；只读和 plan 只展示差异。使用 schema v2 并保留已有有效 rules 与 allowed_modes，不注册阶段或模型清单；v1 原件保留并提示用户处理，不自动迁移。配置成功后检查所选 Skill 入口；缺失遵循共享初始化的 SKILLS-HUB 指引。
4. 回读写入，分别报告配置保存/复用、Skill 已安装/缺失、运行能力已检查/未检查及失败恢复入口。初始化不派遣业务任务；后续调用按 <Path>{roots.references}/coordination/coordination-contract.md</Path> 执行。

默认在会话报告，不生成空业务对象或 command state。用户要求保存报告时写入 <Path>{roots.state}/commands/coordination-init/{date}-{scope}-{topic}[-NN].md</Path>，使用日期、小写 scope/topic，冲突取最小未占用编号，原子落盘后回读。报告记录项目、用户选择、计划/执行模式、实际差异、检查和未完成项，不覆盖已有报告。

配置冲突、漂移、未知 schema、链接路径或 owner 不明时保留原件，只停止相关写入。Skill 包安装由 CLI 网关负责；本 Command 不接管 Hub 清单。偏好不是 Git、远程发送、发布、部署或永久知识写入的授权。

