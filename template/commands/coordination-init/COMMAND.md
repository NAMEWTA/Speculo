---
id: coordination-init
description: Explicitly initialize or update the project's default agent coordination method for every workflow.
---

# 项目编排初始化

用户明确调用本 Command 时，配置所有 workflow 共用的一个默认编排方式；安装或发现入口不触发初始化。用户可以指定方式、项目 Skill 目录、只读/plan，或明确更改已有默认值。具体模型、任务顺序、角色与技能组合留给当次编排请求。

1. 从项目根字面路径 `.agents/speculo/.speculo/workspace.json` 验证 workspace 和 roots，再读 `{roots.config}`；缺少安装时提示运行 `speculo init`，不猜测写入根。确认当前项目与写入 owner、安装事务和锁无冲突。
2. 按 <Path>{roots.references}/coordination/initialization.md</Path> 校验并复用已有选择；首次选择 Herdr / Orca / CLI / 当前宿主（暂时都不要）之一。未回答或取消不视为选择当前宿主。
3. 由本 Command 唯一管理 <Path>{roots.state}/coordination/project.json</Path> 的默认偏好写入；只读和 plan 只展示差异。保持 schema v1 和已有有效 rules，不注册阶段或模型清单。配置成功后检查所选 Skill 入口；缺失遵循共享初始化的 SKILLS-HUB 指引。
4. 回读写入，分别报告配置保存/复用、Skill 已安装/缺失、运行能力已检查/未检查及失败恢复入口。初始化不派遣业务任务；后续调用按 <Path>{roots.references}/coordination/coordination-contract.md</Path> 执行。

默认在会话报告，不生成空业务对象或 command state。用户要求保存报告时写入 <Path>{roots.state}/commands/coordination-init/{date}-{scope}-{topic}[-NN].md</Path>，使用日期、小写 scope/topic，冲突取最小未占用编号，原子落盘后回读。报告记录项目、用户选择、计划/执行模式、实际差异、检查和未完成项，不覆盖已有报告。

配置冲突、漂移、未知 schema、链接路径或 owner 不明时保留原件，只停止相关写入。Skill 包安装由 CLI 网关负责；本 Command 不接管 Hub 清单。偏好不是 Git、远程发送、发布、部署或永久知识写入的授权。
