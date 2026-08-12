# Goal Plan 完成、证据与恢复

## 1. 整体 Definition of Done

至少要求：

- Spec 验收合同全部有通过 Evidence 或明确批准的 deferred；
- current 模式的非 cancelled Ticket 都有 implementation commit、通过的 direct-parent 验证和父分支 result SHA；required 模式都有 source commit、通过的 candidate 和父分支 result SHA；
- shared path、接口、数据、兼容、迁移、调用点与回滚合同闭合；
- 项目定向检查、受影响回归、类型检查、lint/build 和适用 E2E 无未经批准退化；
- change 状态、Ticket、Map、Goal Plan、Evidence 与实际 Git 状态一致；
- 没有未集成 implementation/source checkpoint、活动 integration candidate 或未决高影响偏差。

无需改动的 Ticket 必须转为 `cancelled` 并记录来源事实；不得用 Evidence-only Done 或 empty commit 关闭。

## 2. 两层验证

- `current-workspace`：current 模式 implementation owner 运行 Ticket 要求的检查，Lead 在同一 workspace 运行受影响集成/回归和适用 E2E；
- `source-worktree`/`parent-candidate`：required 模式由 implementation owner 和 Lead 分别运行非 E2E 与集成/E2E 检查。

Evidence 必须记录命令运行环境。required 模式任何在 source worktree 声称的 E2E pass 都无效；subagent 返回的测试结果在 Lead 核对前保持候选状态。

## 3. Gate 关闭

Lead 在每个 Gate 汇总覆盖 Evidence、接口/数据/兼容状态、candidate/result SHA、适用 E2E、反向验证、偏差、风险和批准。Gate 不以“完成若干 Ticket”作为唯一关闭条件。

## 4. 失败与恢复

- current/source 检查失败：保留当前 workspace 或 source worktree，继续当前 Ticket；
- direct-parent/candidate 冲突或检查失败：父分支不动，integration 记 `failed`，Ticket 回到 `in_progress`/`blocked`；
- 父 HEAD 漂移：integration 记 `stale`，从最新父分支重建并重跑；
- E2E required 失败：父分支不动，保留失败命令、适用 checkpoint 和恢复条件；
- 命中当次 Dispatch Packet/候选协议的停止条件、继续修正已无合理收益或需要新产品决定：停止受影响 Wave，按 deviation control 返回契约 owner；
- Lead 会话变化：读取 Goal Plan、Ticket、change worktree 状态与最新 Evidence，从最后不可变 checkpoint 恢复。

## 5. Change 完成 owner

Lead 是 Goal Plan change 的唯一完成 owner。没有 Goal Plan 的单 Ticket/Direct Spec 由当前 I-implement owner 按 change completion 规则完成。Archive 不补造完成证据。

**完成标准**：所有通过、阻塞、取消和未验证声明均定位到权威工件、命令与 Git checkpoint；失败不会推进父分支或 Done。
