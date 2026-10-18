# 开发任务的编排边界

SpecDev 实际委派任务时，在共享编排方法之外读取本文件。全局初始化属于 command/coordination-init；普通 Work 和无安装直接模式不要求先初始化编排。

## 输入与作者

Lead 明确任务所用 Work、阶段和必要前置条件：Ticket implementation 提供 Map → 适用 ALL/本票项目 Skill → Ticket；Direct Spec 提供唯一获批规格、项目 Agent 指令、命中 Skill、AC/验证与路径合同；review 提供固定候选及对应轴的来源。有父 Goal 时附实际 revision、组合 task ID、依赖 Gate、并行上限和集成次序。

计划、Spec、Ticket、Map、说明和代码可以由被派遣的 worker 在指定写集中直接生成或修改。作者不因此成为 Lead；原 Plan lead、审批、正式 Evidence、README Outcome 以及进度状态仍由原 owner 在核验后维护。编写候选不能自行宣称 Ready、done 或批准；需要状态字段的初稿使用其 Work 的未验收初值。若现有工件修改影响完成结论，Lead 先使受影响验收失效，再分配写入。

用户说“生成计划”不自动绑定必须已有 Ticket 的完整 Goal Plan；按真实目标选择相应 Work 或一般规划产物，实际调用 Work 时仍满足其前置。不为通用编排补造 Goal、Ticket 或 change。

## 工作区、审查与接续

按 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path> 分开决定票据调度、Agent 编排和工作区。一个 change 复用 README 的唯一工作区，默认 current；serial 逐票推进但允许同票协作，parallel/auto 按 DAG、路径与实际资源推进。协作者数量和工具选择不触发额外 worktree。

双轴审查默认派遣一位未参与本范围实现的原生 subagent，分别给出两轴结果；用户选定的可用工具和 review 安排优先。核对真实实现者、reviewer 与派遣/返回证据；同一实现者改名或清空会话不构成独立。缺少独立 reviewer 时阻塞审查完成，回退 lead 也不能自审替代。正式 Evidence、集成和整体 E2E 仍由原 owner 核验。

有明确授权的 run/resume 完成当前实现、审查、验证和同范围修复后，继续下一 Ready 任务，不逐票要求“继续”。同范围 finding 沿原任务修复；重复 blocker 或达到有效尝试上限时保留证据，只有新证据或实质改变才能重试。业务生命周期门由 owning Work 核对，通用派遣结构通过不等于允许启动已取消或已归档的业务。

新派遣使用共享 TASK v2；存量 TASK v1 继续使用 <Path>{roots.workflows}/specdev/common/tools/validate-handoff.mjs</Path> 原接口，保留 active change、固定 kind 与归档冻结检查。它是历史校验适配器，不是其他领域的依赖。
