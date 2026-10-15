# 外部 Agent 的任务交接

[手册首页](README.md) · [SpecDev](workflows/specdev.md) · [切换会话的 handoff 命令](commands/handoff.md)

当 Leader 通过 CLI、Herdr 或 Orca 把工作派给另一个 Agent 时，使用一份输入和一份报告完成交接。Leader 负责拆分、接收和验收，执行者负责指定范围与回报。这里的 Leader 与方法文件中的 Lead 是同一角色。

## 放在哪里

已有 SpecDev change 的外部派遣使用以下结构。路径从当前 change 根开始；默认安装下它位于 `.agents/speculo/.speculo/specdev/changes/`。

```text
<change>/
├── README.md
├── evidence/
└── sessions/
    └── 20261015T083000Z/
        ├── 001-code-review/
        │   ├── TASK.md
        │   └── REPORT.md
        ├── 002-research/
        │   ├── TASK.md
        │   └── REPORT.md
        └── 003-implement/
            ├── TASK.md
            └── REPORT.md
```

- session 表示一轮编排，使用 UTC `YYYYMMDDTHHMMSSZ`，不带任务类型；同秒冲突加 `-01` 等后缀，恢复同一轮继续使用。
- task 表示一次派遣，使用递增编号加实际主题。审查、研究、实现和测试观察都用同一结构，具体 Work、任务类型和 Ticket 写入 TASK；重试另建目录，引用前次报告。
- Orca Run/Dispatch、Herdr pane 和执行 CLI 的会话 ID 保留真实值，记录在交接中，不与目录 ID 混用。

实际派遣才建目录，正常情况下每个任务只有两份 Markdown。原 Evidence 链接它们并保存 Leader 的验收结论。归档时目录随 change 保留，引用绑定稳定 change 名称和 change 内路径。已有历史目录不改名。

当前约定面向本机 CLI 与外部编排，未提供远程 CI 的传入/取回适配。宿主原生子 Agent 可以按需采用，Leader 自行完成任务无需创建。无 change 时使用原 Work 的报告或会话结果；外部网页仍按原 ZIP 交付方法执行。

## TASK：交给它什么

Leader 派遣前写明以下内容，已有材料直接引用：

| 内容 | 示例 |
|---|---|
| 身份与目标 | 本轮 session、本次 task、review、关联 T-01（存在时）；审查指定候选的曝光选择行为 |
| 必要输入 | 真实 Work/Skill 入口、规格、Ticket、前序报告与已确定决定 |
| 工作区与范围 | 实际工作副本、基线、允许修改的文件、授权动作与停止条件 |
| 验收 | 需要观察的行为、检查命令、由 Leader 负责的整体 Gate |
| 返回与通信 | REPORT 的准确位置、如何提问/通知、实际工具句柄与主机 |

输入必须让一个没有读过原聊天的 Agent 能开始工作。独立工作区先确认能读取材料并交付报告；只读审查允许写自己的报告，业务文件仍只读。

TASK 的返回要求包含这段指令：

> 交付前主动定位本次会话的原始历史记录，核对所属主机、会话 ID 和可读性，在 REPORT 中记录真实路径及本任务检索范围。无法取得时说明原因，不猜测路径。报告正文应能独立说明结果，不要求接收方先读完整聊天。

TASK 正文派遣后保持稳定，Leader 可以补记刚取得的工具句柄。目标、权限或基线实质变化时新建任务。执行者不修改 TASK、正式 Evidence 或业务状态。

## REPORT：交回什么

下面展示简短结构，实际报告应替换示例中的身份、结果和路径：

```markdown
# 任务回报

Session: 20261015T083000Z
Task: 001-code-review
Status: completed

## 聚焦交接
已完成固定候选的指定审查，findings 和未验证项见下文。
业务文件保持只读；下一步由 Leader 核对 findings 并决定后续处理。

## 产物与验证
- 审查成果：实际候选 SHA、findings 的文件位置、依据和影响；无发现则明确说明。
- 验证：实际检查范围、命令、退出码、环境和观察结果。
- 未验证：列出未运行项及原因，没有则写“无”。

## 问题与下一步
无阻塞；等待 Leader 按原验收合同核对。

## 历史会话
- 工具与主机：真实工具及记录所在主机。
- 会话 ID：工具提供的真实标识。
- 原始记录：所属主机上的实际绝对路径，或工具原生历史入口。
- 核验：由谁、在哪台主机确认了会话对应关系和可读性；未核验项及原因。
- 本任务范围与检索线索：消息/时间范围、关键词。
```

| Status | 含义 |
|---|---|
| `completed` | 分配范围已完成，候选交回待验收 |
| `blocked` | 需要输入、权限、依赖或决定，说明恢复条件 |
| `failed` | 本次尝试失败，说明已尝试内容和保存的产物 |
| `cancelled` | 按真实指示取消，说明已发生影响与停止情况 |

执行中通过工具原生通道提问和报告进度。交回时写一次完整报告，回读后通知“session/task、状态、报告位置、一句话摘要”。报告不充当持续刷新的状态表；需要修正交付时使用新的任务目录。

工具只返回文本时，Leader 可原样保存并标注 `Captured-by: Lead` 与消息来源。进程意外中断、没有报告时，Leader 查询原任务并在原 Evidence 记下已知与未知事实。没有报告不代表没有执行，终端 idle 或退出也不代表业务通过。

## 聚焦交接：先摘要，再查历史

报告开头三至五句话交代完成内容、关键决定、停点和下一步。原始历史作为可回查的依据，按以下方式准备和使用：

1. 执行者交付前主动查询当前工具的会话元数据或历史接口，Leader 用真实派遣句柄补充。需要查文件时，只按该工具文档说明的目录/格式和真实会话 ID 查找；不能按修改时间挑“最新文件”，也不能猜缓存目录。相对路径只按工具明确给出的日志根解析。
2. 文件记录在所属主机核对实际绝对路径并读取少量内容；只有原生历史入口时，通过工具查询验证可读性，不要求一定产出 JSONL。用记录或元数据核对会话 ID，圈定本任务消息或时间范围，报告写明核验者与主机；源端可读不代表接收端可读。无法取得、身份不符或不可读时写清原因。
3. 接收方先读摘要及当前文件，有具体疑问才检查主机和访问能力，按关键词、消息 ID 或时间检索少量片段。JSONL 按工具实际格式读取，不假定通用字段，不默认加载完整聊天，也不启动或接管旧会话。

这是要求 Agent 利用当前工具执行的步骤，Speculo 未增加自动发现日志的服务。项目外原记录用“所属主机＋原生绝对路径”作只读定位信息；其他主机上的同名路径不能当作同一记录。

默认引用原记录。原记录即将清理、接收工作区无法读取或需要长期留存时，优先引用已有的本任务快照；确有需要且 Leader 能读取源记录时，再保存获准范围的 `history-01.jsonl` 等快照到任务目录。原 Evidence 记录位置、来源、捕获时间、完整还是节选；后来查得的路径和核验结果也追加到 Evidence，不改写已交付 REPORT。其他原生格式保留原扩展名。记录缺失或已清理时说明原因，不伪造快照；已有报告和真实产物仍可核验，缺少关键事实才阻塞对应验收。

Orca 的历史搜索有主机范围；SSH 转发后的搜索端不一定是当前 shell 所在机器。按当前版本指南检查索引是否启用与搜索目标，避免把路径过滤当成切换主机。

## 方法来源与权威

该设计借鉴 [Anthropic 的明确派遣与文件成果交付](https://www.anthropic.com/engineering/multi-agent-research-system)、[A2A 的上下文与任务区分](https://a2a-protocol.org/latest/topics/life-of-a-task/)，以及 [Orca 的 Focused handoff 实现](https://github.com/stablyai/orca/blob/main/src/renderer/src/lib/agent-session-continuation.ts)。Speculo 采用这些方法中的输入、交付和按需回查原则，不实现它们的网络协议或调度器。

执行约定以[共享编排方法](../template/references/coordination/coordination-contract.md)、[派遣文件合同](../template/references/coordination/session-files.md)和[返回验收合同](../template/references/coordination/result-and-recovery.md)为准。报告的 `completed` 由执行者声明；最终业务完成仍由 Leader 核对实际产物并写入原 Evidence、Ticket 或 README Outcome。
