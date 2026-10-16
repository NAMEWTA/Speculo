# 派遣文件与聚焦交接

在已有 change 中通过 CLI、Herdr、Orca 等外部工具实际派遣任务时读取。宿主原生协作按需采用，Lead 自行执行不创建虚构派遣。无 change 时使用当前 Work 已有报告位置，不补造 change。external-web 继续使用原 ZIP 交付合同。

## 目录与身份

SpecDev 任务目录为 <Path>{roots.state}/specdev/changes/{change}/sessions/{session}/{task}/</Path>：

- `{session}` 是一轮编排的交接分组，使用 UTC `YYYYMMDDTHHMMSSZ`，首次实际派遣才创建；同秒冲突追加最小未使用后缀 `-01`、`-02`。同一编排计划的实施、审查与修复沿用原轮次，恢复 Lead 或更换工具会话不自动新建轮次；另起独立编排或已收束后的新一轮执行才新建。
- `{task}` 是一次具体派遣，使用轮内最大编号加一，至少三位，后接小写英文主题，如 `001-implement-a1`、`002-implement-a2`、`003-review-a1`。Lead 分配编号，不回收、不从未经检查的标题直接拼路径。具体 Work、任务类型、change/Ticket 写入 TASK。
- 一轮可以只有一个 task，也可以并行或依次派遣多个 task；目录不是父子 Agent 拓扑。编排标识与工具的 Run、Dispatch、pane、provider session ID 分开，不能从临时目录 UUID 推导工具会话。
- 普通提问、进度通知与未交付任务的正常恢复沿用原 task。正式交付后的修复、重新派遣、更换执行者或实质改变输入时建立新编号并引用旧报告，不覆盖旧输入与结果，不增加 attempt 子目录。工具状态未知时先查询原调用，不能以新编号为由重复派遣仍可能写入的任务。
- 目录必须在当前 change 内，无链接跳转、大小写冲突或编号占用。一个工具会话可以承接多个 task，各自通过 TASK 与 REPORT 区分任务。

| 文件 | 唯一写入者 | 创建与更新 |
|---|---|---|
| <Path>{roots.state}/specdev/changes/{change}/sessions/{session}/{task}/TASK.md</Path> | Lead | 派遣前写入并回读，投递后冻结 |
| <Path>{roots.state}/specdev/changes/{change}/sessions/{session}/{task}/session-locator.json</Path> | Lead | 准确确认本任务会话日志的绝对路径后才创建 |
| <Path>{roots.state}/specdev/changes/{change}/sessions/{session}/{task}/REPORT.md</Path> | 执行者；仅文本返回时由 Lead 原样捕获 | 本次派遣交付时一次性写入，正式交付后不覆盖 |

不预造空定位文件、session 总表、状态 JSON、心跳或聊天流水。定位文件只保存一个会话日志路径，不承载执行进度、业务 Outcome 或另一套验收。

原 Evidence 或当前 Work 工件引用这些文件并保存 Lead 验收，不复制正文或重复维护地址。持久导航绑定稳定 change 身份与 change 根相对 locator，归档后按该 change 的唯一实际位置解析。其他领域仅在其 Work 已拥有的产物位置使用交接内容，不接管 SpecDev namespace。

## 输入与文件所有权

派遣前按 <Path>{roots.references}/coordination/task-template.md</Path> 形成 TASK。YAML frontmatter 使用 `schema_version: 1`、`session`、`task`、`kind`；kind 为 `implementation | review | research | test-observation`。已有 change/Ticket 可写入可选 `change`、`ticket`，不补造对象。重复键、未知版本和身份不一致均拒绝。正文使用五组内容：

| 章节 | 必需事实 |
|---|---|
| Goal | Lead、分配的执行者职责、目标与成功定义 |
| Inputs | 真实 Work/Skill 入口、必要规格和依赖产物、已锁定决定；前序背景先引用原报告 |
| Workspace and Scope | 真实执行位置与基线、允许/只读/共享路径及 owner、共享构建输出与测试资源、已获授权的动作和停止条件 |
| Acceptance | 检查命令、可观察通过标准、执行者未运行的 Gate 及其 owner；整体 E2E 仍由 Lead 核验 |
| Return | 准确 REPORT 位置、原生提问/通知方式、当前调用方式；可选定位文件的固定位置与唯一写入者 |

任务输入只含派遣前确定的事实。派遣后准确取得的日志绝对路径写入可选定位文件，不回改 TASK；工具句柄沿原生接口使用。投递消息包含准确 TASK 位置，不复制全部上下文。普通澄清通过原生通道回答，影响结果的答复写入 REPORT，改变目标、基线或权限则建立新任务。

派遣前确认执行者能读输入和必要材料、能交付报告；独立工作区须明确实际可读输入与可写报告位置。只有工具返回文本时，由 Lead 原样捕获为 REPORT，标注 `Captured-by: Lead` 和原始消息 locator，不补造执行者的验证结果。执行者与 Lead 不同时写报告。

执行者只写获准产物和自己的 REPORT，不修改 TASK、定位文件或正式 Evidence。只读任务只能写明确分配的报告及允许的测试产物。共享路径、Git index、构建输出及其他语义资源仍按原 owner/串行阶段协调，报告位置不同不代表业务写集互不冲突。

TASK 与 REPORT 完成候选内容后，使用同目录临时文件与不覆盖目标的原子落盘方式；写前检查未占用，写后回读。临时文件不是正式报告，也不能作为完成信号。

## 会话定位文件

派遣后，Lead 准确确认执行者会话日志的绝对路径，才在 TASK 同目录创建可选的 session-locator.json。文件仅有 `path` 一个字段，合同为 <Path>{roots.workflows}/specdev/common/schemas/session-locator.schema.json</Path>：

```json
{"path": "/absolute/path/to/session.jsonl"}
```

不附加工具、主机、权限、会话 ID、任务范围或核验记录；所属任务由所在目录确定。执行者可通过原生通道提供地址，Lead 核对后落盘。取不到准确地址就不创建文件，不写空值或占位路径，也不阻塞可独立核验的交付。

优先从工具实际返回的会话信息取得路径；必要时按已知真实会话 ID 定向查找，读取少量日志确认属于本次执行者与任务。原生子 Agent 不能误用父会话日志。不要猜缓存路径、按修改时间取最新日志，或从临时目录 UUID 推导会话。仅有原生历史入口、相对路径或无法确认的远端地址时省略此文件。

写入前检查目标未占用，使用同目录临时文件原子落盘并回读；已有相同地址可复用，冲突时保留原文件并核对，不静默覆盖。地址晚于 REPORT 取得时可独立补建，不修改冻结 TASK 或 REPORT；归档后不回填。

回查时先读 TASK、REPORT 与当前产物，有具体疑问才读取 path 指向的日志，结合任务输入和关键词少量检索。地址不可读或对应关系不明时，继续从实际产物核验，缺少关键事实仅阻塞对应验收。日志只是历史材料，不授予 resume、接管或额外动作权限。

原始日志由工具管理，SpecDev 不复制、移动或转换 JSONL。外部绝对路径只作只读地址，不使用内部 Path 标签，不是可移植项目路径或写目标；引用不承诺日志永久可用。

## 报告与返回

交付时使用 <Path>{roots.references}/coordination/report-template.md</Path>。REPORT 保持普通 Markdown 首部 `Session`、`Task`、`Status`；状态只取一个实际值：

| Status | 表示什么 |
|---|---|
| completed | 分配范围的候选已交回，仍待 Lead 验收 |
| blocked | 缺输入、权限、依赖或决定，说明恢复条件 |
| failed | 本次尝试失败，保留产物和失败事实 |
| cancelled | 按实际指示取消，记录影响和停止情况 |

正文用三至五句话聚焦交接，再列产物、真实检查命令/退出码/环境、未验证项、问题与下一步。定位文件已存在时只引用它，不重复维护地址；没有定位文件不影响报告成立。

进行中问题和进度使用原生通道；blocked 是交回本次派遣，正常提问并等待仍在原任务内。报告不作为可变状态面板。回读报告成功后，通过原生通道返回“session/task、Status、报告位置、一句话摘要”，遵守工具当前原生完成参数，不把本合同枚举塞入工具不支持的字段。结果不明或缺报告时查询原调用，不重复派遣可能仍在写入的任务。

## 校验、兼容与归档

新 SpecDev 派遣在投递前、回收时分别使用 <Path>{roots.workflows}/specdev/common/tools/validate-handoff.mjs</Path> 的 `--stage dispatch|return`。参数为 `--repo <project> [--method-root <methods> --state-root <data-parent>] --change <change> --session <session> --task <task>`；无安装直接使用须给出三个根，state-root 为领域共同父根。dispatch 检查 TASK 且拒绝已有 REPORT；return 增加 REPORT 身份/状态检查。定位文件可缺失；存在则检查仅含非空 path 字段且为绝对路径。CLI 返回 JSON errors/warnings；退出 0 表示结构通过，1 表示校验失败，2 表示参数错误。

工具只读项目内显式任务，不扫描日志缓存或自动打开外部历史，也不认证真实身份、授权、原始日志内容、工具执行或业务完成。TASK/REPORT 的章节与结构不能替代 Lead 检查实质内容。

新派遣采用此合同；存量 TASK、REPORT、旧历史文字及已有快照保持原状，按原合同回收，不批量升级或补字段。新版校验器不把旧无版本 TASK 当作新版通过，历史不纳入新派遣扫描；后续重试使用新任务。

输入、定位文件与报告随所属 change 保留并进入原归档完整性清单。既有历史副本按原字节保留，不再新建。归档前仍确认相关 writer 已停止，REPORT completed 不是业务完成或移动许可。归档后只读，外部工具日志的寿命由工具决定，引用不承诺永久可用。
