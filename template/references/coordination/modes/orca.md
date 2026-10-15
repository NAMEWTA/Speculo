# Orca 编排

仅在用户为当前任务明确选择 Orca 时读取；选择可来自同范围仍有效的会话授权。plan 只说明接入步骤，不安装、不启动。Orca 选择不隐含 worktree、模型或拓扑选择。

## 按需安装项目 Skill

当前 Lead 负责首次接入，项目根由调用 Work 已验证的 projectRoot 确定，不取终端 cwd、桌面客户端路径或方法安装根。

1. 检查项目 `<Path>{roots.skills}/orca/SKILL.md</Path>`（标准布局为项目 `.agents/skills/orca/SKILL.md`）。存在且为有效 `name: orca` 的完整 Skill 时先读取并复用，核对来源和兼容性；不因上游更新静默覆盖。符号链接、同名非 Skill、无效内容或归属冲突时保留原文件，仅阻塞安装分支，说明冲突位置与恢复方式。
2. 缺失时从指定上游 [Orca SKILL.md](https://github.com/NAMEWTA/wta-skills-hub/blob/main/skills/automation/orca/SKILL.md) 获取 Skill。先解析 main 的实际 revision，再从该 revision 下载 `skills/automation/orca/` 的完整内容；当前上游为单文件，未来若有相对资源依赖须完整获取，不能只保存 GitHub HTML 页面。Skill 指向的 Orca 内置指南由实际 CLI 提供，不是缺失的本地资源。
3. 使用宿主可用的 Skill 安装器并显式指定项目 `.agents/skills/` 为目标；没有安装器时用宿主下载和文件工具完成同一流程。先在临时位置检查 UTF-8 Markdown、YAML frontmatter、`name: orca`、引用闭包及路径，再以不覆盖方式安装。保留上游原文、frontmatter、许可和文件模式，不重写命令或权限参数。下载/校验失败时不留下半成品正式目录；目标期间发生变化时停止，不覆盖重试。
4. 安装后回读实际 Skill，核对内容摘要与候选一致，在当前 Work 已有 Evidence/报告或会话结果中记录上游 URL、revision、内容 SHA-256、目标和结果。没有报告就不为安装制造 change 或 receipt。此 Skill 是项目第三方资产，不加入 Speculo 的投影清单，也不由 init/refresh 更新或删除。

用户选择并要求使用 Orca 时可完成上述项目本地安装；持久配置本身不是新安装授权。安装 Skill 不等于安装或升级 Orca、登录账户、配对远端或启动服务。缺少网络或写权限时只阻塞 Orca 分支，给出原目标和缺失条件；重试前重新检查目标，不能自动换另一种执行方式。

## 运行与返回

安装或复用后必须读取项目内 Skill，按其规则定位实际 CLI：优先核对 `ORCA_CLI_COMMAND`，开发上下文核对 `ORCA_DEV_REPO_ROOT`；Linux 非托管环境使用指南规定的 `orca-ide` 入口，避免误调用同名屏幕阅读器。不要套用 Herdr 的环境变量要求，也不把环境值交给 eval。固定入口后读取本机 `--help`、`skills get orca-cli`；需要受监督编排时再读 `skills get orchestration` 及当前分支参考。核对版本、来源、执行主机与目标 runtime 能力，不把上游 main 当作本机可用接口。

宿主技能列表是否已刷新不替代读取真实项目文件；安装成功也不证明 CLI 或远端可用。入口、权限或目标能力失败时保留原错误，只阻塞此方式，不静默切换生产/开发版或本地/远端入口，不自行安装升级或重启服务。

1. 确认用户项目、当前工作区以及当前 Lead 的责任。需要保留 Lead 连续推进时使用受监督任务方式；完整 handoff 会转移责任，只有用户明确选择该交接时才使用。
2. 沿当前工具提供的任务、工作区、会话和消息接口建立目标。Orca 管理的 worktree 由 Orca 操作；允许工具支持的 folder workspace，不凭空要求所有项目必须有 Git worktree。工具和模型沿用户选择及当前指南确定，不固化 agent/runner 清单；保留用户焦点，不复用 Herdr 参数。
3. 使用 <Path>{roots.references}/coordination/task-brief.md</Path> 的真实入口和任务说明。有 change 时先保存 TASK，提供 REPORT 位置；记录编排 session/task 对应的 Orca Run、Task、Dispatch、终端及 provider 会话中实际存在的 locator 和所属主机，不以标题猜句柄。
4. 区分投递已接收、任务开始、任务返回、写入停止和业务验收。Run、Task、Dispatch 与终端、工作区分别使用真实返回的身份；已有 Run/Dispatch 按指南恢复，不重复创建。工具已有生命周期由工具管理，不再建调度器，也不用其他 subagent 工具冒充 Orca 派遣。
5. 处理该任务的 question、完成及升级请求；已有权威答案由 Lead 回答，额外权限或产品决定再交用户。报告保存后按当前原生完成协议发送摘要与报告位置；支持 report-path 时传真实路径。REPORT 的 completed/blocked/failed/cancelled 不直接代替 Orca 的 outcome 参数；按本版 worker 协议提交原 Task/Dispatch 的结果，已结算的不再补写第二次完成。处理必要消息与资源归属后才确认收件，不因超时重建同一问题。
6. 状态不明时重读原任务、回执和收件事实；只有本版支持同请求重放且原参数可核对时才恢复原操作。旧句柄失效时重新发现目标，不同时向旧、新目标重复发送。idle、无输出、断线或清单缺项均不能证明任务结束。
7. 接收、取消、保留或释放工作区按当前指南及真实授权操作。结算后复用、保留或释放资源，运行中取消使用精确目标的原生停止流程；不以关闭终端、全局 reset 或删除工作区代替结算。完成消息不等于旧写入者已经停止。

核对返回、实际候选和写入停止事实后，由 Lead 按原验收更新 Evidence，并按 <Path>{roots.references}/coordination/result-and-recovery.md</Path> 接续原 Goal。工具或所需能力不可用时准确报告当前阻塞。

## 聚焦交接与历史

按 <Path>{roots.references}/coordination/session-files.md</Path> 在报告中保存简短交接和原始会话入口。借鉴 Focused handoff：先读最近摘要与当前工作区，仅在细节不足时检索原会话；这是历史上下文交付，不自动转移 Leader 所有权或 resume 原 provider 会话。

执行者交付前主动从当前版本的会话元数据或历史接口定位 transcript/history locator 与 provider session ID，Lead 用真实派遣句柄补充。按派遣文件合同核验所属主机、真实入口、会话对应关系和可读性，并记录本任务范围；无法核验时说明原因。需要搜索时先按当前指南检查历史索引是否启用，再在正确主机上按实际会话 ID 查找，结合任务关键词、执行路径或时间缩小范围；索引未启用就记录搜索不可用，不自行开启，仍可核验工具已提供的原始入口。SSH 转发 CLI 的搜索主机可能是控制端，路径过滤不等于切换主机。原记录缺失时可保留带来源与范围的终端节选，但必须明确是节选，不能称为完整会话或伪造 JSONL。
