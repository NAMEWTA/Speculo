# 必要偏好与真实工具配置

初始化处理项目协作选择，或当前任务确需其他持久化偏好/工具设置时读取；不是缺少文件即补全骨架。

## 项目协作选择

先读 <Path>{roots.references}/coordination/coordination-contract.md</Path> 与 <Path>{roots.references}/coordination/project-facts.schema.json</Path>。本 Work 拥有此次 <Path>{roots.state}/coordination/project.json</Path> 偏好写入；已存在时先验证，未知 schema、冲突或无效内容保留原件，只停止相关配置写入。只读和 plan 仅展示选择及预期差异，不执行下列写入。

1. 已有有效配置时展示 defaults 与适用的 Work/阶段覆盖，直接复用；不因服务当前不可用重问或改写偏好。未配置时说明“这是项目默认偏好，外部方式不可用时由当前智能体继续”，让用户在 Herdr、Orca、CLI、暂时都不要中选择。当前会话已有同范围明确选择时复用；取消或尚未回答不视为 lead，不产生文件。
2. 选择 Herdr/Orca 后明确项目根，让用户选择 `.agents/skills/` 或 `.claude/skills/`，并说明将读取该位置已安装的完整 Skill，缺失时通过 Speculo 安装器安装。同范围已明确的目录直接复用；不按宿主名称替用户决定。入口位置为所选目录下的 `herdr/` 或 `orca/`，将完整项目相对入口写入 defaults.guide。选择 CLI 协作方式不需要这两个 Skill；具体工具、模型、交互方式只复用真实已知选择，缺失时在实际使用前确定。
3. 外部方式保存为 `mode: herdr | orca | cli`、`selection: preferred`、`fallback: [lead]`；“暂时都不要”保存为 `mode: lead`，以后不重复询问。首次创建使用 schema_version 1 和空 rules；用户主动更改只替换 defaults，保留所有 rules 及有效的其他配置。旧 defaults 中属于前一工具的 tool/model/guide 不带到新方式；同方式已知的有效工具信息保留。本次选择不是强制外部工具要求，不擅自把既有 required 或 Work/阶段安排改成可回退。
4. 配置候选经 schema 验证后，写前重读确认原内容未漂移，检查根、owner 与重叠事务/锁，再在同目录临时文件中形成完整候选并原子替换，最后回读验证。首次创建若目标已出现、任何路径含符号链接或发生漂移则停止相关写入，保留已有内容。配置失败不继续依赖该配置的接入；独立事实发现继续。
5. 配置成功后，按本次方式读取 <Path>{roots.references}/coordination/modes/herdr.md</Path> 或 <Path>{roots.references}/coordination/modes/orca.md</Path> 的本地入口分支。已有完整 Skill 则读取复用；缺失时保留偏好与目标，引导用户重新运行 `speculo init`，在 SKILLS-HUB 勾选对应 `automation/herdr` 或 `automation/orca` 并选择位置。Work 不下载、不另行复制技能包、不写 CLI 归属清单。当前任务按 fallback 继续；初始化不要求服务已启动，不进入派遣或服务控制。

例如用户选择 Herdr 并指定 `.claude/skills/`，首次写入：

```json
{
  "schema_version": 1,
  "defaults": {
    "mode": "herdr",
    "selection": "preferred",
    "guide": ".claude/skills/herdr/SKILL.md",
    "fallback": ["lead"]
  },
  "rules": []
}
```

guide 是用户选择的读取/安装位置，不是“已安装”凭证，也不是机器绝对路径。只更改 defaults 不移动或删除旧 Skill；CLI 安装的包由 <Path>{roots.state}/hub-skills.json</Path> 跟踪；用户手工安装的同名包保持用户归属。最终分别回报配置保存/复用、Skill 结果、运行能力未检查或实际检查结果；缺失或冲突时给出原目标与安装器操作步骤，不制造 change 或独立回执。

## 其他必要偏好

语言、用户工具和明确产物数量复用当次请求或现有项目说明。实现并发、worktree、集成尝试上限只在原 Goal/Implementation Plan 真正启用时明确，由计划 `## Execution Policy Source` 记录实际来源；默认 current 单写入者。Lead 自己实现计入实现并发，只读协作者不设新数字上限。UI 缺省 3、配置 2–4、用户明确数量覆盖上限；一次 override 留当前设计包，不改全局偏好。

现有 <Path>{roots.state}/specdev/config.json</Path> 中 GitHub labels/include_external_prs、验证/planning 等真实消费者配置，可按 <Path>{roots.workflows}/specdev/common/schemas/config.schema.json</Path> 验证和保留；只有确需该工具时才创建，必要结构参考 <Path>{roots.workflows}/specdev/specdev-i-init-setup/assets/config-template.json</Path>。不把旧配置整份机械改写为 config.md；未知独有字段保留并报告。无标签只阻塞相关远程写入。

任何配置更新先核对实际差异和授权，不保存秘密或凭据，不存全局自动 commit/集成/发布开关。未知验证命令为 null/未知，必须有仓库或真实用户来源。既有无效/未知 schema 不重置、不迁移；显式转换由原 owner 执行。

change/ADR/context/docs/archive/design 等只在真实首次内容写入时创建；不生成 status、change status、空知识树、空批准槽或跟踪镜像。项目说明确需导航时可使用 <Path>{roots.workflows}/specdev/specdev-i-init-setup/assets/tracking-template.md</Path> 与 <Path>{roots.workflows}/specdev/specdev-i-init-setup/assets/domain-layout-template.md</Path> 的相关内容，不要求输出两份配置文档。工程 docs 基线由入口的共享事实方法负责。
