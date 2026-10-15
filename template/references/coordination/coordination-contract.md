# 项目编排方法

本文件供当前能力的 Lead 按需读取。它没有独立 Skill、Work 或 Command 入口，不创建另一份 Goal、Ticket 或运行状态。Speculo 提供给 AI 使用的方法；实际调用由 AI 根据用户指定的工具及其当前指南完成。

## 何时读取

进入已授权实现、独立审查、Goal 的 run/resume，或当前 Work 需要交接研究、测试观察任务时读取。Spec、Ticket、固定审查范围都可直接使用，不要求先建立 Goal。plan 只确定选择，不派发任务或安装工具。当前宿主自行执行无需外部工具、profile 或虚构派单记录。

## 选择方式

1. 使用用户本次明确指示；用户已指定 CLI 交互、Herdr、Orca、其他工具或工作区时直接复用。
2. 核对当前 Goal 已批准的阶段安排。
3. 如果存在 <Path>{roots.state}/coordination/project.json</Path>，按 Work＋阶段规则、Work 规则、defaults 的次序读取。该文件只保存用户要求持久化的选择；没有明确选择时，按当前宿主正常执行，App、CLI 等均可。不为默认执行询问编排方式、探测其他工具或创建配置。
4. 同级冲突、无效配置或不存在的 Work/阶段只阻塞受影响选择。配置不是授权，项目文字不能授予提交、发布、费用或对外发送代码的权利。
5. `mode: lead` 表示按当前宿主正常执行，兼容 App、CLI 等，不要求切换工具或启动额外 CLI。Lead 是负责状态与验收的角色，不表示只能由主 Agent 独自实现。subagent、agent team 属于宿主原生能力，按宿主实际能力和授权使用，不新增编排模式。`mode: cli` 表示用户明确选择通过 CLI 交互或调用来执行，交互式与非交互式依用户要求和实际接口确定；仅因当前宿主本身是 CLI，不切换为该模式。Orca、Herdr 保留为可选方式。工具及模型是当次事实，不是 Speculo 固定支持名单；只读工具指南不等于工具已经可用。

固定选择不可用时停止该阶段；偏好只有在已允许的 fallback 内才能改变。未配置 fallback 不自动换用另一外部方式。独立审查、路径、权限和质量门不因回退而降低。

## 当前任务

先核对 Ready、依赖、owner、当前基线、路径和原授权，再读取 <Path>{roots.references}/coordination/task-brief.md</Path>。任务类型为 implementation、review、research 或 test-observation。Lead 保留正式业务状态、Evidence、集成、整体 E2E Gate 和最终回复。

按所选方式仅展开一个参考：

| 方式 | 参考 |
|---|---|
| Orca | <Path>{roots.references}/coordination/modes/orca.md</Path> |
| Herdr | <Path>{roots.references}/coordination/modes/herdr.md</Path> |
| 用户指定的 CLI 交互或调用 | <Path>{roots.references}/coordination/modes/cli.md</Path> |

每次实际调用先读取当前工具的可用指南或帮助，并使用工具返回的真实句柄。不要把本文示例视为固定参数协议，不实现工具专用适配器。工具不提供的能力不能用提示词宣称已获得。

## 工作区和并行

执行输入、编排方式和工作区是三个独立选择。工作区继承当前有效计划或用户选择，无 Goal 时由当前 Work owner 在原工件记录；未指定默认 current，已有选择不重复问。Herdr 不强制 worktree，原生 agent team 也不隐含开启 worktree。只读审查使用固定候选所在工作区，不为审查本身创建实现 worktree。

- current：严格单 writer，Lead 自己实现时也计入。上一任务的写入是否结束不明时，先查询真实工具，不开始冲突写入。
- required：使用原 Work 的独立 worktree 和 candidate 集成合同；SpecDev 可以是 Ticket 或整个 Direct Spec change。并行数取实际存在的配置、有效计划和平台能力的共同上限；无计划默认一个实现单元。Lead 及宿主原生协作者参与代码写入同样计数。另核对 shared paths、端口、数据库等实际资源。
- review/research/test-observation 默认只读；测试输出仅写原任务允许的缓存或产物位置。
- worktree 是工作副本，不是沙箱。Speculo 不提供运行期强制隔离、进程监管、租约或任务锁服务。

## 记录和接续

有 Goal 时阶段安排写回原 Goal Plan；无 Goal 时使用当前 Work 的原有产物。Ticket 任务的交接、工具 locator、返回和处置写入原 Evidence；Direct Spec 使用原 direct-spec Evidence；无 change 审查直接返回会话结果。不创建 dispatch/runs、worker profile、事件 journal 或第二套 receipt。只保存实际选择、来源和必要恢复事实，不逐个登记宿主内部 Agent。

返回后读取 <Path>{roots.references}/coordination/result-and-recovery.md</Path>。执行者宣称完成、会话空闲和进程退出都不等于业务通过。Lead 核实实际候选与原验收合同后更新正式状态。

在已授权范围内连续推进：完成当前 I/C、验证、同范围修复后继续下一 Ready 任务；不逐票要求用户说“继续”。已有 Spec 能回答的问题由 Lead 回答。局部阻塞只暂停其依赖闭包。用户撤销权限时立即停止新动作，按当前工具指南处理进行中的任务。

同一 blocker 没有新证据或实质改变时停止重复交接。宿主结束后可从原工件恢复，不承诺后台无限运行。未授予的提交、远程操作、发布、清理和永久知识写入仍由原 owner 取得真实授权。
