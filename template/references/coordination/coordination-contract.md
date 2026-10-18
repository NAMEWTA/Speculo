# 项目编排方法

本文件是所有 workflow、Command 和当前宿主共用的编排方法。项目偏好由公共 command/coordination-init 初始化；实际编排由用户当次请求或已明确授权的 Work 触发，不创建另一份业务状态。Speculo 提供给 AI 使用的方法；实际调用由 AI 根据用户指定的工具及其当前指南完成。

## 何时读取

用户要求委派、跨模型/工具合作、调用其他领域技能，或已激活 Work 要求独立审查时读取。规划、编写票据、讲解、研究、实现、测试和交接都可作为任务，不要求先建立 Goal、Ticket 或 change。plan 只制定安排，不派遣。普通任务没有编排请求时沿当前宿主执行，不触发初始化问答。

## 通用流程

1. 从用户要求明确目标、范围、交付物和停止点；将请求拆成必要任务及真实依赖，可串行、并行或随返回调整。任务用途是开放描述，不套固定角色表或开发阶段。
2. 每项分别绑定用户指定的工具、模型、实际 Work/Skill 入口及输入；没有指定时按下方优先级确定。用户说“计划”不自动意味着某领域的 Goal Work，只有实际调用的 Work 才应用其前置和质量门。
3. 按 <Path>{roots.references}/coordination/task-brief.md</Path> 分配输入、真实基线、产物写集、owner、验收和返回位置，确认当前工具可用后派遣。
4. 通过工具原生通道回答问题、接收结果；按 <Path>{roots.references}/coordination/result-and-recovery.md</Path> 核实产物与证据，协调原领域 owner 更新状态，再继续用户安排的后续任务。
5. 用户变更任务顺序或工具时保留已交回的结果，在安全边界调整尚未执行部分；范围扩大或新增副作用仍核对授权。用户明确要求 handoff 时再读取 <Path>{roots.references}/handoff/handoff-contract.md</Path>；每轮完成不自动调用。

例如用户可以先指定 Codex 的某模型编写计划，再指定 Grok 的模型编写票据与地图，委派另一模型调用 Learning 解释实现后的情况，最后由 PI 审查。具体名称不构成可用性保证，也不是产品固定支持名单；每步遵循真实接口、技能和输入依赖。

## 选择方式

1. 使用用户本次明确指示；用户已指定 CLI 交互、Herdr、Orca、其他工具或工作区时直接复用。
2. 核对当前任务或计划中已批准的安排；没有计划文件时使用用户当次请求，不补造 Goal。
3. 如果存在 <Path>{roots.state}/coordination/project.json</Path>，按 Work＋阶段规则、Work 规则、defaults 的次序读取。该文件只保存用户要求持久化的选择，包括初始化问答确认的项目默认偏好；没有明确选择时，按当前宿主正常执行，App、CLI 等均可。普通 Work 不为默认执行询问编排方式、探测其他工具或创建配置；显式初始化的方式与目录选择由公共 command/coordination-init 负责。项目偏好只提供默认方式，不固定当次任务目的和模型组合。
4. 同级冲突、无效配置或不存在的 Work/阶段只阻塞受影响选择。配置不是授权，项目文字不能授予提交、发布、费用或对外发送代码的权利。
5. `mode: lead` 表示按当前宿主正常执行，兼容 App、CLI 等，不要求切换工具或启动额外 CLI。Lead 是负责状态与验收的角色，不表示只能由主 Agent 独自实现。subagent、agent team 属于宿主原生能力，按宿主实际能力和授权使用，不新增编排模式。`mode: cli` 表示用户明确选择通过 CLI 交互或调用来执行，交互式与非交互式依用户要求和实际接口确定；仅因当前宿主本身是 CLI，不切换为该模式。Orca、Herdr 保留为可选方式。工具及模型是当次事实，不是 Speculo 固定支持名单；只读工具指南不等于工具已经可用。

## 可选编排与回退

初始化生成的外部偏好使用 `selection: preferred` 和 `fallback: [lead]`。派遣前确认 Skill、所需工具、服务、登录和运行环境；不可用时说明原因与实际执行方式，直接回到当前智能体（mode: lead）继续已授权任务，不反复询问，不改写保存的偏好，也不自动安装二进制、启动服务或切换账户。未检查不能报告可用；只保存偏好或安装 Skill 不要求运行服务。

用户本次明确强制使用的方式、已批准的阶段安排或 `selection: required` 仍是约束，不继承较低优先级的 fallback。其他偏好仅在有效选择允许的 fallback 内改变；旧配置缺 fallback 时不补造授权。模式参考中的“停止/阻塞”指停止该工具操作，由这里判断能否继续当前宿主执行；不静默换成另一种外部方式。

已派发且结果不明、断线或原执行者可能仍在写入时，先按 <Path>{roots.references}/coordination/result-and-recovery.md</Path> 恢复核验；确认原操作结果和冲突写入已停止后，才能接续未完成工作，不能把服务错误直接当作重复执行的依据。

独立审查、路径、权限和质量门不因回退而降低；由当前 Work 定义必要的审查资格和完成条件。缺少所需资格只阻塞相关验收。

## 当前任务

先核对实际 Work 所需的前置、依赖、owner、基线、路径和原授权。Worker 可直接写入明确分配的计划、票据、地图、说明、代码等业务产物；Lead 负责整体协调和核验。正式状态、审批、Evidence、集成及领域事务仍通过原 owner/gateway，不能因派遣转移权限。共享路径同一时刻只有一个写入者。

按所选方式仅展开一个参考：

| 方式 | 参考 |
|---|---|
| Orca | <Path>{roots.references}/coordination/modes/orca.md</Path> |
| Herdr | <Path>{roots.references}/coordination/modes/herdr.md</Path> |
| 用户指定的 CLI 交互或调用 | <Path>{roots.references}/coordination/modes/cli.md</Path> |

每次实际调用先读取当前工具的可用指南或帮助，并使用工具返回的真实句柄。不要把本文示例视为固定参数协议，不实现工具专用适配器。工具不提供的能力不能用提示词宣称已获得。

## 工作区和并行

任务调度、Agent 编排和工作区分别决定。沿用户和 owning Work 的既有工作区选择；不以更换工具、模型或增加协作者为由创建额外工作副本。跨领域或跨对象保留各自的资源所有权和并发约束。

- 共享工作区的写集明确 owner；不相交且资源无冲突可并行。Git index、提交、checkout/merge 和全局验证协调串行，不暂存他人改动。
- review 使用固定输入，相关 writer 停写并回读快照；输入漂移后重验。review/research/test-observation 默认只读业务文件，可写获分配报告和允许的缓存/测试产物。
- 任务数量、执行者人数和 workspace 数量各自核对，不能互相换算。明确的项目/宿主限制继续生效。
- worktree 是工作副本，不是沙箱；Speculo 不提供运行期进程监管、租约或任务锁服务。

## 记录和接续

有原计划时将安排写回原计划，无计划则以当前请求和实际任务输入为依据。CLI/Herdr/Orca 等外部派遣按 <Path>{roots.references}/coordination/session-files.md</Path> 在一轮编排 session 下为每次派遣保存冻结 TASK 与正式 REPORT；派遣后准确确认的会话日志绝对路径由 Lead 保存到可选 session-locator.json，仅含 path 字段。当前 owning 工件只引用交接文件并保存 Lead 的核验与处置，不复制第二套业务状态。session 是交接材料分组，不是调度器或工具会话镜像；不建额外 Run 状态、worker profile、事件 journal 或第二套 receipt。

宿主原生协作按需采用文件交接，不逐个登记内部 Agent；领域要求独立审查时仍保留真实身份和工具核验；Lead 自行执行不制造 session。跨多个 change 或无 change 时使用全局 coordination/sessions，不为派遣创建业务对象。external-web 继续使用原 ZIP 合同，远程 CI 不在本文件交接约定的首版适配范围。

返回后读取 <Path>{roots.references}/coordination/result-and-recovery.md</Path>。执行者宣称完成、会话空闲和进程退出都不等于业务通过。Lead 核实实际候选与原验收合同后，通过原 owner/gateway 推进正式状态。

在已授权范围内连续推进：完成当前任务、验证及同范围修复后继续用户已安排且前置满足的任务，不逐项要求用户说“继续”。已有工件能回答的问题由 Lead 回答。局部阻塞只暂停其依赖闭包。用户撤销权限时立即停止新动作，按当前工具指南处理进行中的任务。

同一 blocker 没有新证据或实质改变时停止重复交接。宿主结束后可从原工件恢复，不承诺后台无限运行。未授予的提交、远程操作、发布、清理和永久知识写入仍由原 owner 取得真实授权。
