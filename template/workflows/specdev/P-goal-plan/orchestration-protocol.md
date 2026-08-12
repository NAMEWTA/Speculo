# Goal Plan 核心编排协议

本文件定义 DAG、Wave、Gate、路径所有权、Ticket workspace 策略、Evidence 返回和父分支集成队列。

## 1. DAG 与关键路径

- 依赖权威来自 Ticket frontmatter 的 `blocked_by`；Tickets Map 是投影；
- 计算根节点、扇出、汇合点、关键路径、共享合同 owner 和最终收缩点；
- 依赖只表示真实开始条件，不表达偏好、Agent 交接或“最好先做”；
- 无法独立保持可验证状态的迁移批次必须有明确 Gate 和恢复策略。

## 2. Wave 与实现并发

required 模式的 Wave 内 Ticket 必须 Ready、依赖 Evidence 完整、项目写路径不相交、shared owner 已稳定、适用 Gate 已打开且基线一致。current 模式即使 DAG 存在可并行节点，也强制一次只执行一个 Ticket。

Lead 根据当前事实决定自行实现或派单。required 模式同时活跃的 implementation subagent 不得超过 Goal Plan、config 与平台能力的共同上限；current 模式保持单 writer 串行安全不变量。Lead 不计入。Wave 是可并发性，不是必须填满的目标。只读 review/research/test-observation agent 不写固定数字上限，但不得写项目或 SpecDev 状态，也不得争用同一可变测试环境。

## 3. Gate

Gate 用可验证状态定义，必须写明：工程/业务状态、开启条件、关闭证据、阻塞范围、Lead/批准人和失败恢复。常见 Gate 包括共享合同稳定、首条垂直路径、迁移完成、旧调用点归零、候选合并通过、发布就绪和观察期结束。

## 4. Shared path 与合同

遵循 `<Path>{roots.workflows}/specdev/common/rules/path-ownership.md</Path>`：

1. 专用 owner Ticket 修改共享路径；
2. required 模式在其 source worktree 形成 commit 与非 E2E 证据；current 模式在当前 workspace 形成 commit 与证据；
3. required 模式通过 Lead candidate-merge 进入父分支；current 模式由 Lead 在父分支 direct-parent 验证并推进；
4. required 模式下游 Ticket 基于新的父分支 checkpoint 创建或刷新 worktree；current 模式仅在前一 Ticket 完成后开始下一个；
5. 共享合同变化时暂停消费者并修订上游，不让多个执行者竞争写入。

## 5. 每 Ticket workspace 记录

每个进入 I-implement 的 Ticket 建立唯一记录。current 模式使用 `workspace_ref=current`、`branch=parent_branch`，记录 implementation/source/result SHA 与 direct-parent 验证；required 模式使用唯一 `specdev-worktree/<ticket-id>`，记录 source/candidate/result SHA 与验证状态。Lead 自行实现或派 subagent 不改变所选策略。

required 模式同一 Ticket 在 candidate 验证失败后保留来源 worktree 并继续修正。新的 source commit 替换当前 `source_checkpoint`，旧 commit 继续由 Git/Evidence 可追溯。成功集成不自动清理 branch/worktree。

## 6. 父分支集成队列

required 模式 Lead 串行集成 Ready 候选：

1. 冻结最新 `parent_before_sha`；
2. 在 Lead-owned parent integration checkout 组合父分支与 `source_checkpoint`；
3. 生成可定位的 `candidate_sha`；
4. 在 candidate 状态运行集成检查和适用 E2E；
5. 重读父 HEAD；若变化，将候选标记 `stale` 并重建；
6. 检查通过且父 HEAD 未变时，父分支 fast-forward 到 candidate；
7. 重读父 HEAD/tree，写入 `result_sha` 后才允许 Ticket Done。

父分支是 source checkpoint 的祖先时 candidate/result 可等于 source SHA，方法为 `fast-forward`；否则 candidate 必须是独立 merge commit。候选失败时父分支保持不变，Ticket 回到 `in_progress` 或 `blocked`。current 模式跳过候选 checkout，Lead 在 current workspace 核对 implementation commit、运行集成检查并记录 `method=direct-parent`；失败时父 HEAD 不推进。

## 7. Expand-contract

标准顺序为 expand → migrate → observe → contract → verify。每批迁移独立 commit、按所选策略验证和父分支集成；收缩依据旧调用/数据/协议归零证据，不依据 Ticket 数量推断。

**完成标准**：每个 Ticket 从父基线、implementation/source commit、对应 integration 到 result 都可恢复；父分支只包含已通过所选门禁的 Ticket。
