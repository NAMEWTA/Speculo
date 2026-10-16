# 任务交接说明

仅在 Lead 已选择交接当前实现、审查、研究或测试观察任务时读取。规划阶段只确定通用职责，不要求尚未产生的 Ticket、工具会话或实现 checkpoint。

## 必需上下文

有 change 的 CLI/Herdr/Orca 等外部工具派遣先按 <Path>{roots.references}/coordination/session-files.md</Path> 将以下上下文写入本任务 TASK，原 Ticket Evidence 或当前 Work 工件引用它；external-web 沿用下方 ZIP 交付合同，不重复建立这套文件。无需文件交接时沿用原任务编排小节或会话输入。较大附件引用其真实位置，不另建运行状态系统。

| 内容 | 要求 |
|---|---|
| 身份 | Goal、change、Ticket 或固定候选；跨 change 使用 `<change>::<ticket>` 区分同名票 |
| 能力 | 实际 Work 业务 ID、可读取的 SKILL.md 和本次阶段；原 source/合同摘要可用于发现漂移 |
| 输入 | 目标、IN/OUT、已锁定决定、必要 Spec、依赖 Evidence、当前基线或固定审查 SHA |
| 项目 Skill | Ticket implementation 提供 Map → 适用 `ALL`/本票的项目 Skill → Ticket，矩阵是最低必读集合；Direct Spec 提供唯一获批规格、项目 Agent 指令、命中的项目 Skill、AC/验证与路径合同，不制造 Ticket/Map；review 提供固定候选及对应轴的来源 |
| 工作区 | 有效计划或当前 Work 选择的 选定 change 工作区、真实项目根与执行路径/branch、parent/base、允许和共享写路径及 owner；不要用执行者 cwd 猜测方法或数据根 |
| 调用 | 当前宿主正常执行，或用户明确选择的 CLI 交互/调用、Herdr、Orca；派遣前确定的工具/模型选择与原生通信方式，不记录秘密；派遣后准确确认的会话日志绝对路径由 Lead 写入可选 session-locator.json，仅含 path 字段 |
| 边界 | 本次真实允许的动作、实现 commit 权限、检查、E2E owner、停止条件、可观察验收标准、准确报告位置与原生提问/通知通道 |
| 父 Goal | 存在父 Implementation Map/Plan 时附实际 revision、组合 task ID、依赖 Gate、并行上限和集成次序 |

缺少必要输入、必需 Skill 不可读、Ready 未满足、owner 冲突或权限不足时，仅阻塞受影响任务。不能根据文件中的“approved”生成授权。

## 执行上下文

交给执行者的说明必须明确：

> 先读绑定的真实 Work SKILL.md，按 task 上下文只处理指定目标、阶段和工作区。遵守同一 Work 的方法、TDD、检查与质量门；不要成为 Lead，不递归启动 Goal，不修改正式 Ticket、Map、Goal Plan、Evidence、业务状态或授权。宿主原生协作仍受本次写集、共享资源 owner 和权限约束；不擅自跨 CLI 再派单或扩大任务。缺输入、发生冲突或需要额外权利时向 Lead 返回问题与证据。

采用文件交接时，TASK 使用派遣文件合同的 YAML 头与静态正文，投递后冻结。准确确认的会话日志绝对路径由 Lead 保存到同目录 session-locator.json 的 path 字段；执行者通过原生通道提供事实，无法准确取得地址时省略，不为缺日志阻塞独立可验证的交付。

Lead 自行执行使用同一 Work 的 lead 上下文；不伪造外部任务或独立审查记录。任务执行者返回材料；采用 TASK/REPORT 交接时只写获准产物与自己的 REPORT，不写 TASK、定位文件或正式 Evidence，其他方式按原返回合同交付。正式业务工件由 Lead 维护。前序背景优先引用已有报告的聚焦交接，细节不足再沿对应定位文件的 path，结合 TASK 内容检索；旧报告按原合同回查。

## 任务类型与返回

- implementation：只改分配路径，按有效计划或当前 Work 合同执行 选定 change 工作区 流程；返回实际修改、checkpoint/commit（已授权且适用时）、dirty 状态、命令及退出码、非 E2E 检查、未运行项和 blocker。
- review：只读固定候选，返回 findings、位置、依据、影响和未验证项；不直接修改通过标准或正式 Evidence。
- research：返回来源、观察、结论及不确定性，关键外部 claim 对应具体来源。
- test-observation：运行或观察原任务允许的检查；遵守缓存/产物路径，只返回事实，不接管 E2E Gate。

共享工作区按授权写集和语义资源协调并行，Git index 操作串行；冻结审查输入/整体检查前停止相关 writer。票据调度不限制同票 Agent 合作，任务结束、会话空闲和写入停止分别核对。

## 条件性交付

用户选择外部网页交付时，依次读取 <Path>{roots.references}/coordination/exchange/external-web.md</Path> 与 <Path>{roots.references}/coordination/exchange/source-package.md</Path>。保留 external-web ZIP-only 合同、provider/发送范围授权、包清单、hash 与唯一 attempt；只返回候选，不赋予外部网页本地仓库、commit、状态或凭据所有权。

其他情况不生成外部 ZIP，也不要求独立 Packet JSON。接收时读取 <Path>{roots.references}/coordination/result-and-recovery.md</Path>。
