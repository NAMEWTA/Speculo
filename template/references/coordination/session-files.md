# 派遣文件与聚焦交接

实际委派前按恢复与审计需要选择交接形式，通道名称本身不决定文件要求。Lead 自行执行与普通工具并行不创建虚构派遣。external-web 的传输包在传完后立即删除，不写入本目录。

## 先选即时返回或持久交接

短时、同步、只读、没有远程副作用/并行写入/跨会话恢复/正式交付要求，且实际工具返回能关联 task 与 call 的任务，可以直接提供必要输入并接收结构化结果，不建 session 目录。返回记录实际 task、callId、status、summary、findings、checks、unverified；未运行项写明，idle/超时不等于 completed。即时结果保留在原工具返回与 owning 工件需要的引用中，不复制另一套运行状态。

长时、异步、跨会话、并行写入、可能中断恢复或正式交付，使用下文持久 TASK/REPORT。短任务一旦范围扩大、开始写入或需要恢复，先停止新增动作，由原 owner 明确新范围并建立持久交接；不能先发生副作用再用只读标签追认。外部结果不明先查询原调用，不凭没有 session 文件重复派遣。

只读结构检查可调用 validate-dispatch.mjs 的 `--inline`，从 stdin 接收 JSON（不要求保存 JSON 文件）：

```json
{"handoff":"inline","stage":"return","task":"read-api-contract","callId":"tool-call-17","scope":{"synchronous":true,"readOnly":true,"externalEffects":false,"parallelWrites":false,"recoveryRequired":false,"formalDelivery":false},"result":{"task":"read-api-contract","callId":"tool-call-17","status":"completed","summary":"已核对接口声明","findings":[],"checks":["读取公开接口"],"unverified":["未执行服务请求"]}}
```

派遣前 `stage: dispatch` 不含 result；交回时必须匹配真实 callId/task。范围旗标与结构校验不能认证授权、无副作用或结果真实性，Lead 必须回读真实工具返回。持久任务仍用下列文件校验，不能用即时分支绕过路径、writer 与恢复证据。

## 目录与身份

派遣前确定一个项目内的范围根 scopeRoot，以项目根相对路径明确传入。恰好一个已存在、未归档的 change 承载整轮任务时，scopeRoot 是它的真实 change 目录；其他情况（包括跨多个 change、没有 change 或 OPS 资源任务）使用 <Path>{roots.state}/coordination/</Path>。该共享 namespace 由当轮 Lead 管理交接材料，不管理业务状态。

任务目录固定为 `scopeRoot/sessions/{session}/{task}/`；实际 TASK/REPORT 位置必须填成接收方可读写的准确地址。一轮开始后不搬迁范围根，后续产生 change 时在其负责工件引用原交接位置。跨领域各自产物仍写各自获准路径。单个 change 的会话随其原归档保留；全局会话留在 coordination，不能随某个成员归档移动。



- `{session}` 是一轮编排的交接分组，使用 UTC `YYYYMMDDTHHMMSSZ`，首次需要持久交接的实际派遣才创建；同秒冲突追加最小未使用后缀 `-01`、`-02`。同一编排计划的实施、审查与修复沿用原轮次，恢复 Lead 或更换工具会话不自动新建轮次；另起独立编排或已收束后的新一轮执行才新建。
- `{task}` 是一次具体派遣，使用轮内最大编号加一，至少三位，后接小写英文主题，如 `001-implement-a1`、`002-implement-a2`、`003-review-a1`。Lead 分配编号，不回收、不从未经检查的标题直接拼路径。具体 Work、任务类型、change/Ticket 写入 TASK。
- 一轮可以只有一个 task，也可以并行或依次派遣多个 task；目录不是父子 Agent 拓扑。编排标识与工具的 Run、Dispatch、pane、provider session ID 分开，不能从临时目录 UUID 推导工具会话。
- 普通提问、进度通知与未交付任务的正常恢复沿用原 task。正式交付后的修复、重新派遣、更换执行者或实质改变输入时建立新编号并引用旧报告，不覆盖旧输入与结果，不增加 attempt 子目录。工具状态未知时先查询原调用，不能以新编号为由重复派遣仍可能写入的任务。
- 目录必须在已确认的 scopeRoot 内，无链接跳转、大小写冲突或编号占用。一个工具会话可以承接多个 task，各自通过 TASK 与 REPORT 区分任务。

| 文件 | 唯一写入者 | 创建与更新 |
|---|---|---|
| `TASK.md` | Lead | 派遣前写入并回读，投递后冻结 |
| `REPORT.md` | 执行者；仅文本返回时由 Lead 原样捕获 | 本次派遣交付时一次性写入，正式交付后不覆盖 |

任务目录在派遣时只有 `TASK.md`，回收后只有 `TASK.md` 与 `REPORT.md`。不预造 session 总表、状态 JSON、心跳、聊天流水、压缩包、校验文件、清单、日志快照、临时文件或其他文档。这些文件不承载执行进度、业务 Outcome 或另一套验收。

原 Evidence 或当前 Work 工件引用这些文件并保存 Lead 验收，不复制正文或重复维护地址。有 change 时导航绑定领域、稳定 change 身份与根相对 locator，归档后按唯一实际位置解析；全局派遣使用项目根相对 locator。调用方不跨域接管业务 namespace。

## 输入与文件所有权

派遣前按 <Path>{roots.references}/coordination/task-template.md</Path> 形成 TASK。YAML frontmatter 使用 `schema_version: 2`、`session`、`task`、`kind`；kind 是非空的本次任务用途，如 planning、tickets、explanation、implementation、review 或用户明确请求的 handoff；它不充当权限枚举。已有 change/Ticket 可写入可选 `change`、`ticket`，不补造对象。重复键、未知版本和身份不一致均拒绝。正文使用五组内容：

| 章节 | 必需事实 |
|---|---|
| Goal | Lead、分配的执行者职责、目标与成功定义 |
| Inputs | 真实 Work/Skill 入口、必要规格和依赖产物、已锁定决定；前序背景先引用原报告 |
| Workspace and Scope | 真实执行位置与基线、允许/只读/共享路径及 owner、共享构建输出与测试资源、已获授权的动作和停止条件 |
| Acceptance | 检查命令、可观察通过标准、执行者未运行的 Gate 及其 owner；整体 E2E 仍由 Lead 核验 |
| Return | 准确 REPORT 位置、原生提问/通知方式、当前调用方式 |

任务输入只含派遣前确定的事实。投递后不回改 TASK；工具句柄沿原生接口使用。投递消息包含准确 TASK 位置，不复制全部上下文。普通澄清通过原生通道回答，影响结果的答复写入 REPORT，改变目标、基线或权限则建立新任务。

派遣前确认执行者能读输入和必要材料、能交付报告；独立工作区须明确实际可读输入与可写报告位置。只有工具返回文本时，由 Lead 原样捕获为 REPORT，标注 `Captured-by: Lead` 和原始消息 locator，不补造执行者的验证结果。执行者与 Lead 不同时写报告。

执行者只写获准产物和自己的 REPORT，不修改 TASK 或正式 Evidence。只读任务只能写明确分配的报告及允许的测试产物。共享路径、Git index、构建输出及其他语义资源仍按原 owner/串行阶段协调，报告位置不同不代表业务写集互不冲突。

直接把 TASK.md 或 REPORT.md 写成最终文件名，写前确认目标未占用，写后回读。不要在任务目录留下临时文件；临时文件不是正式报告，也不能作为完成信号。

## 可选会话日志行

准确确认本任务会话日志的绝对路径时，在 REPORT 首部写一行纯文本，不知道就整行省略：

```text
Session log: /absolute/path/to/session.jsonl
```

只写这一行，不附加主机、权限、会话 ID 或核验记录。取不到准确地址不写占位路径，也不阻塞可独立核验的交付。优先使用工具实际返回的会话信息；必要时按已知真实会话 ID 定向确认它属于本次执行者与任务。原生子 Agent 不能引用父会话日志。不要猜缓存路径、按修改时间取最新日志，或从临时目录 UUID 推导会话。只有原生历史入口、相对路径或无法确认的远端地址时省略该行。

该行随 REPORT 一次写入。交付后不改 REPORT，也不另建文件补地址。回查时先读 TASK、REPORT 与当前产物，有具体疑问才按这一行读取少量日志。地址不可读时继续从实际产物核验，缺少关键事实仅阻塞对应验收。日志只是历史材料，不授予 resume、接管或额外动作权限。

原始日志由工具管理，本协议不复制、移动或转换它。这一行不是内部 Path 标签，不是可移植项目路径或写目标；引用不承诺日志永久可用。

## 报告与返回

交付时使用 <Path>{roots.references}/coordination/report-template.md</Path>。REPORT 保持普通 Markdown 首部 `Session`、`Task`、`Status`；状态只取一个实际值：

| Status | 表示什么 |
|---|---|
| completed | 分配范围的候选已交回，仍待 Lead 验收 |
| blocked | 缺输入、权限、依赖或决定，说明恢复条件 |
| failed | 本次尝试失败，保留产物和失败事实 |
| cancelled | 按实际指示取消，记录影响和停止情况 |

正文用三至五句话聚焦交接，再列产物、真实检查命令/退出码/环境、未验证项、问题与下一步。有 `Session log` 行时不在正文重复维护该地址；没有该行不影响报告成立。

进行中问题和进度使用原生通道；blocked 是交回本次派遣，正常提问并等待仍在原任务内。报告不作为可变状态面板。回读报告成功后，通过原生通道返回“session/task、Status、报告位置、一句话摘要”，遵守工具当前原生完成参数，不把本合同枚举塞入工具不支持的字段。结果不明或缺报告时查询原调用，不重复派遣可能仍在写入的任务。

## 校验、兼容与归档

新 TASK v2 在投递前、回收时分别使用 <Path>{roots.references}/coordination/scripts/validate-dispatch.mjs</Path> 的 `--stage dispatch|return`。参数为 `--repo <project> --scope-root <project-relative-owner-root> --session <session> --task <task>`；范围根必须是项目内真实目录，工具检查其下 sessions 目录。dispatch 要求任务目录只有 TASK.md，并拒绝已有 REPORT；return 只允许 TASK.md 与 REPORT.md，并增加 REPORT 身份/状态检查。出现其他文件或目录即失败。CLI 返回 JSON errors/warnings；退出 0 为结构通过，1 为校验失败，2 为参数错误。

结构校验不判断领域 lifecycle、Ready 或 owner。调用方派遣前仍须通过真实 Work 的前置与授权检查；handoff 总结可读取已结束未归档对象，但不重开业务或改写完成状态。

工具只读项目内显式任务，不扫描日志缓存或自动打开外部历史，也不认证真实身份、授权、原始日志内容、工具执行或业务完成。TASK/REPORT 的章节与结构不能替代 Lead 检查实质内容。

新派遣采用此合同；存量 TASK、REPORT、旧历史文字及已有快照保持原状，按原合同回收，不批量升级或补字段。旧 v1 继续由原领域的历史适配器校验，新版校验器不把 v1 或无版本 TASK 当作 v2 通过，历史不纳入新派遣扫描；后续重试使用新任务。

位于 change 内的 TASK 与 REPORT 随所属对象保留并进入原归档完整性清单；全局记录保持原位置。既有历史副本按原字节保留，不再新建日志副本或其他交接文件。归档前仍确认相关 writer 已停止，REPORT completed 不是业务完成或移动许可。归档后只读，外部工具日志的寿命由工具决定，引用不承诺永久可用。

