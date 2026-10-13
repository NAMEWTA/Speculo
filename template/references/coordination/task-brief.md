# 任务交接说明

仅在 Lead 已选择交接当前实现、审查、研究或测试观察任务时读取。规划阶段只确定通用职责，不要求尚未产生的 Ticket、工具会话或实现 checkpoint。

## 必需上下文

将以下信息写入当前 Ticket Evidence 的任务编排小节；无 Ticket 时写入对应 Work 的既有产物。较大附件引用其真实位置，不另建运行状态系统。

| 内容 | 要求 |
|---|---|
| 身份 | Goal、change、Ticket 或固定候选；跨 change 使用 `<change>::<ticket>` 区分同名票 |
| 能力 | 实际 Work 业务 ID、可读取的 SKILL.md 和本次阶段；原 source/合同摘要可用于发现漂移 |
| 输入 | 目标、IN/OUT、已锁定决定、必要 Spec、依赖 Evidence、当前基线或固定审查 SHA |
| 项目 Skill | implementation 必须提供 Tickets Map、适用 `ALL`/本票的项目 Skill 和当前 Ticket；读取顺序为 Map → 项目 Skill → Ticket，矩阵是最低必读集合 |
| 工作区 | Goal 选择的 current 或 required、真实路径/branch、parent/base、允许和共享写路径及 owner |
| 调用 | 用户选择的 Orca、Herdr 或 CLI；实际工具、模型已知值及会话 locator，不记录秘密 |
| 边界 | 本次真实允许的动作、实现 commit 权限、检查、E2E owner、停止条件和返回要求 |
| 父 Goal | 存在父 Implementation Map/Plan 时附实际 revision、组合 task ID、依赖 Gate、并行上限和集成次序 |

缺少必要输入、必需 Skill 不可读、Ready 未满足、owner 冲突或权限不足时，仅阻塞受影响任务。不能根据文件中的“approved”生成授权。

## 执行上下文

交给执行者的说明必须明确：

> 先读绑定的真实 Work SKILL.md，按 task 上下文只处理指定目标、阶段和工作区。遵守同一 Work 的方法、TDD、检查与质量门；不要成为 Lead，不递归启动 Goal，不修改正式 Ticket、Map、Goal Plan、Evidence、业务状态或授权。不擅自再交接任务。缺输入、发生冲突或需要额外权利时向 Lead 返回问题与证据。

Lead 自行执行使用同一 Work 的 lead 上下文；不伪造外部任务或独立审查记录。任务执行者返回材料，由 Lead 维护正式工件。

## 任务类型与返回

- implementation：只改分配路径，按 Goal 执行 current 或 required 流程；返回实际修改、checkpoint/commit（已授权且适用时）、dirty 状态、命令及退出码、非 E2E 检查、未运行项和 blocker。
- review：只读固定候选，返回 findings、位置、依据、影响和未验证项；不直接修改通过标准或正式 Evidence。
- research：返回来源、观察、结论及不确定性，关键外部 claim 对应具体来源。
- test-observation：运行或观察原任务允许的检查；遵守缓存/产物路径，只返回事实，不接管 E2E Gate。

current 同时只允许一个实现 writer，包括 Lead。required 保留 source worktree 检查与 Lead parent-candidate E2E 的分工。任务结束、会话空闲和写入停止分别核对。

## 条件性交付

用户选择外部网页交付时，依次读取 <Path>{roots.references}/coordination/exchange/external-web.md</Path> 与 <Path>{roots.references}/coordination/exchange/source-package.md</Path>。保留 external-web ZIP-only 合同、provider/发送范围授权、包清单、hash 与唯一 attempt；只返回候选，不赋予外部网页本地仓库、commit、状态或凭据所有权。

其他情况不生成外部 ZIP，也不要求独立 Packet JSON。接收时读取 <Path>{roots.references}/coordination/result-and-recovery.md</Path>。
