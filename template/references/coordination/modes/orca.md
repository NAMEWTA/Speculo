# Orca 编排

仅在初始化明确选择 Orca 接入分支，或按 <Path>{roots.references}/coordination/coordination-contract.md</Path> 为当前任务选中 Orca 时读取；选择可来自当前请求、已批准安排或项目偏好。plan 只说明接入步骤，不安装、不启动。Orca 选择不隐含 worktree、模型或拓扑选择。

## 复用项目 Skill

项目根由调用方已验证的 projectRoot 确定，不取 终端 cwd、桌面客户端路径或方法安装根。

1. 按本次用户指定目录或有效选择的 guide 定位项目入口：`.agents/skills/orca/SKILL.md` 或 `.claude/skills/orca/SKILL.md`，两者均相对已验证的项目根；指定位置缺失时不偷偷换到另一目录。旧配置无此路径时只读检查两个候选，唯一有效且无冲突时复用；两处均有候选时请用户决定。已有其他 guide 文本仅作指南线索，不当作路径或命令执行。此选择不修改 roots.skills 的含义。
2. 存在且为有效 `name: orca` 的完整 Skill 时先读取并复用，核对来源和兼容性。核对每层父目录与目标均位于项目内且不经过符号链接；同名非 Skill、无效内容或归属冲突保留原文件，只停止受影响的读取分支，按共享合同判断回退并说明冲突位置与恢复方式。
3. 缺失时报告未安装，保留偏好与原目标，引导用户重新运行 `speculo init`，在 **SKILLS-HUB** 中勾选 `automation/orca` 并选择项目 `.agents/skills/` 或 `.claude/skills/`。唯一分发源是随 Speculo 包发布的 `skills-hub/automation/orca/` 完整目录；不下载 GitHub main，不从全局缓存复制。无 CLI 的直接模式也据实报告缺失，独立事实发现继续。
4. 完整包的安装、更新、卸载及 Hub 安装归属记录由 CLI 事务管理；Work 只读取入口，不写 CLI 元数据、不覆盖或接管用户手工安装的同名包。安装器保留原文、frontmatter、许可、资源与文件模式；冲突时整包保留并报告。

初始化只配置与复用，不安装二进制、登录账户、配对远端、启动服务或派遣任务。缺 Skill 时按允许的 fallback 回到当前智能体（lead）；强制要求 Orca 时只阻塞相关阶段。最终分别报告配置保存/复用、Skill 已复用或未安装、运行能力未检查或实际检查结果；没有报告就不为此制造 change 或 receipt。

## 运行与返回

实际使用时必须读取所选位置的项目 Skill，按其规则定位实际 CLI：优先核对 `ORCA_CLI_COMMAND`，开发上下文核对 `ORCA_DEV_REPO_ROOT`；Linux 非托管环境使用指南规定的 `orca-ide` 入口，避免误调用同名屏幕阅读器。不要套用 Herdr 的环境变量要求，也不把环境值交给 eval。固定入口后读取本机 `--help`、`skills get orca-cli`；需要受监督编排时再读 `skills get orchestration` 及当前分支参考。核对版本、来源、执行主机与目标 runtime 能力，不把上游 main 当作本机可用接口。

宿主技能列表是否已刷新不替代读取真实项目文件；安装成功也不证明 CLI 或远端可用。入口、权限、服务或目标能力失败时保留原错误，停止此工具操作并由共享合同判断回退当前智能体或阻塞强制的 Orca 阶段；不静默切换生产/开发版或本地/远端入口，不自行安装升级或重启服务。已派发而结果不明时先恢复核验，不直接重复执行。

1. 确认用户项目、当前工作区以及当前 Lead 的责任。需要保留 Lead 连续推进时使用受监督任务方式；Orca 的控制权 handoff 会转移责任，只有用户明确要求转移 Lead 所有权时才使用。请求生成交接摘要不授权转移控制权。
2. 沿当前工具提供的任务、工作区、会话和消息接口建立目标。Orca 管理的 worktree 由 Orca 操作；允许工具支持的 folder workspace，不凭空要求所有项目必须有 Git worktree。工具和模型沿用户选择及当前指南确定，不固化 agent/runner 清单；保留用户焦点，不复用 Herdr 参数。
3. 使用 <Path>{roots.references}/coordination/task-brief.md</Path> 的真实入口和任务说明。派遣前先保存 TASK，提供 REPORT 位置；Lead 仅在准确确认本任务会话日志的绝对路径后，创建只有 path 字段的 session-locator.json，TASK 投递后冻结，不以标题猜句柄。
4. 区分投递已接收、任务开始、任务返回、写入停止和业务验收。Run、Task、Dispatch 与终端、工作区分别使用真实返回的身份；已有 Run/Dispatch 按指南恢复，不重复创建。工具已有生命周期由工具管理，不再建调度器，也不用其他 subagent 工具冒充 Orca 派遣。
5. 处理该任务的 question、完成及升级请求；已有权威答案由 Lead 回答，额外权限或产品决定再交用户。报告保存后按当前原生完成协议发送摘要与报告位置；支持 report-path 时传真实路径。REPORT 的 completed/blocked/failed/cancelled 不直接代替 Orca 的 outcome 参数；按本版 worker 协议提交原 Task/Dispatch 的结果，已结算的不再补写第二次完成。处理必要消息与资源归属后才确认收件，不因超时重建同一问题。
6. 状态不明时重读原任务、回执和收件事实；只有本版支持同请求重放且原参数可核对时才恢复原操作。旧句柄失效时重新发现目标，不同时向旧、新目标重复发送。idle、无输出、断线或清单缺项均不能证明任务结束。
7. 接收、取消、保留或释放工作区按当前指南及真实授权操作。结算后复用、保留或释放资源，运行中取消使用精确目标的原生停止流程；不以关闭终端、全局 reset 或删除工作区代替结算。完成消息不等于旧写入者已经停止。

核对返回、实际候选和写入停止事实后，由 Lead 按原验收更新 Evidence，并按 <Path>{roots.references}/coordination/result-and-recovery.md</Path> 接续原任务。准确报告工具不可用的原因与实际回退或阻塞结果。

## 聚焦交接与历史

按 <Path>{roots.references}/coordination/session-files.md</Path> 在报告中保存简短交接，准确确认的会话日志绝对路径只由 Lead 写入同任务 session-locator.json 的 path 字段。借鉴 Focused handoff：先读最近摘要与当前工作区，仅在细节不足时检索原会话；这是历史上下文交付，不自动转移 Leader 所有权或 resume 原 provider 会话。

工具句柄沿原生接口用于查询与恢复。已取得或执行者提供的日志地址，确认属于本任务执行者且为准确绝对路径后才写入定位文件。无法准确取得时省略地址，不阻塞独立可验证的交付。需要搜索时先按当前指南检查历史索引是否启用，再在正确主机上按实际会话 ID 查找，结合任务关键词、执行路径或时间缩小范围；索引未启用就记录搜索不可用，不自行开启，仍可核验工具已提供的原始入口。SSH 转发 CLI 的搜索主机可能是控制端，路径过滤不等于切换主机。原记录缺失时仍可用实际工具返回与报告核验；终端输出不是原始 JSONL，不为补地址复制或转换日志。
