# 基本概念、调用方式与数据

[手册首页](README.md) · [快速入门](getting-started.md)

## 六个名词就够开始

| 名词 | 通俗解释 | 例子 |
|---|---|---|
| workflow / 领域 | 一组围绕同类工作的方法与产物约定 | SpecDev 管开发，Learning 管学习 |
| Work | 领域内一个可以启动、停止、恢复的步骤 | 写规格、代码审查、生成一节课 |
| Skill | AI 可以按需读取的能力说明文件 | 领域与 Work 都有 `SKILL.md` |
| Command | 用户明确发起的一次工具性请求 | status、handoff、docs-sync |
| change | 一次具体工作的材料容器 | “增加筛选功能”或“学习缓存” |
| Evidence / 证据 | 支持完成结论的真实记录 | 测试命令、输出、截图、文件与批准来源 |

不是所有领域都使用同一种 change：OPS 主要管理 Host、Project、Deployment、Run 等资源。也不是每次只读请求都必须建 change；SpecDev 的明确范围审查可以只返回会话报告。

## CLI 命令与 AI Command 是两回事

终端中的 `speculo` 提供 `init`、`version`、`doctor`、`resolve`、`recover`。它们负责安装、检查和恢复。

[10 个 Command](commands/README.md) 是 AI 读取的 `COMMAND.md`，例如 docs-sync。应对 AI 说“调用 command/docs-sync”，或给入口文件路径；不要把它写成不存在的 `speculo docs-sync`。斜杠命令、`$skill`、技能选择器等快捷方式属于宿主，可用时按宿主方式选择。

## 三种调用粒度

1. **只知道目标**：告诉 AI “使用 SpecDev，帮我判断这个需求下一步做什么”，由领域入口路由。
2. **知道当前步骤**：给业务 ID，例如 `specdev/spec`，避免重新从头走流程。
3. **需要最明确的入口**：提供 `.agents/speculo/workflows/specdev/specdev-s-spec/SKILL.md`，要求先读取再执行。

Command 对应 `.agents/speculo/commands/<id>/COMMAND.md`。项目没有安装时，可使用[普通 SpecDev 直接模式](workflows/specdev.md#不安装-cli-时如何使用)，或[单文件 Canonical](canonical.md)。不能把 SpecDev 的无安装支持推断到所有领域。

## 名字里的字母不是执行顺序

`specdev-p-prototype` 和 `specdev-p-goal-plan` 都有 P，但分别是原型和目标总控；Learning 的 A 也同时存在课程规划和归档。调用时用完整业务 ID 或完整入口，避免只说“运行 P”。

业务 ID、Skill 名和文件路径用于不同位置：

| 用途 | SpecDev 实现示例 |
|---|---|
| 文档与曝光选择的业务 ID | `specdev/implement` |
| 标准 Skill name / 投影目录名 | `specdev-i-implement` |
| 安装后权威入口 | `.agents/speculo/workflows/specdev/specdev-i-implement/SKILL.md` |

## 默认怎么执行

没有明确选择时，AI 按当前宿主正常执行，App、CLI 等均可。subagent、agent team 是宿主能力，是否可用和如何授权由实际宿主决定。

明确要求 CLI 交互、Herdr 或其他方式后，按该选择读取工具指南并执行。当前宿主恰好是 CLI，不代表要再启动另一个 CLI。选择工具也不会自动决定是否使用 worktree；当前工作副本仍保持同一时刻一个代码写入者。

项目可以在明确要求后保存编排偏好，但新手不必先填写配置。当前请求优先于已保存偏好；已有有效计划中的约束也要核对。工具不可用时，AI 应说明受影响分支，按已经允许的回退处理，不能假装调用成功。

已有 change 的外部派遣以一轮 session 分组，每次任务保存 `TASK.md` 输入和 `REPORT.md` 回报；原 Evidence 保存 Leader 的验收。报告带聚焦摘要和按需检索的历史会话入口。原生临时协作按需采用，当前宿主自行执行不创建空目录，详见[外部 Agent 的任务交接](agent-handoffs.md)。

## 从哪里找成果

在默认安装布局中，业务数据根是 `.agents/speculo/.speculo/`：

| 位置 | 通常存放什么 |
|---|---|
| `specdev/changes/<change>/` | README、规格、按需创建的票据、实现与审查证据 |
| `learning/` | 课程、问答、作业、复习、主题知识和位置登记 |
| `ops/` | 控制端、服务器、项目、部署及运行记录 |
| `person/changes/<change>/` | 咨询分析、决策与行动方案 |
| `media/changes/<change>/` | 简报、母稿、制作资料、本地草稿及复盘 |
| `commands/<command>/` | 需要保存的命令报告或该命令自己的运行记录 |
| `docs/` | 使用项目的当前工程事实或指向已有文档的导航 |

以上说明默认布局；实际执行由 `workspace.json` 的 roots 解析，普通 SpecDev 直接模式也可以有明确的独立数据根。模板中出现的 `<Path>{roots.state}/...</Path>` 是路径引用，不是需要原样创建的文件夹名。

本仓库的 `docs/` 是 Speculo 产品手册。安装到其他项目后，那个项目的工程文档、change 历史和命令报告各有自己的位置，不应回写进 Speculo 分发模板。

## 什么时候需要确认

“写一个计划”通常只授权产出计划；“按此规格实施”才明确进入实施。读取或安装入口不等于授权提交、推送、发布、部署、归档移动或永久知识改写。

已有同一目标、动作和范围的授权应复用，不逐层重复询问。新增范围、精确计划发生漂移，或某个动作要求绑定具体批准内容时，才补充对应确认。例如 Git 历史压缩对本地计划和远端发布分别确认，Media 草稿需要绑定当前内容和账号的真实人工确认。

授权不足只阻塞受影响操作。你可以要求先形成可审查的计划、文件或报告，再决定具体操作。

## 如何理解完成、阻塞与恢复

- 文件已经生成，不代表业务行为已经验收。
- 测试通过，不自动代表部署、发布或归档完成。
- 当前工具退出，不代表任务成功；应核对实际产物与证据。
- “blocked”需要准确原因、保留位置和下一步；未知结果应先查询，不能直接重试可能已成功的外部动作。
- 交接时携带真实路径、检查点、权限范围和未闭合动作；由新会话回读验证后恢复。

有关 Spec、Ticket、Goal、Outcome 的具体关系见 [SpecDev](workflows/specdev.md)；学习里的“讲过、答对、延迟掌握”见 [Learning](workflows/learning.md)。
