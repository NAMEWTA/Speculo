# Lead 编排协议

本协议扩展 §5 执行协议中的 Lead+Subagent 模型，覆盖 Lead 在子代理协调中的五个关键环节。当 Lead+Subagent 模型激活时，在 §5 步骤 2「派单」时加载，覆盖整个执行生命周期——从派单到收尾。

协议覆盖：子代理派单上下文载荷、执行完成后 handoff 交接、并行执行合并冲突解决、Worktree 隔离的创建与收尾、里程碑完成时的 neat-freak 收尾审查。

## 1. 子代理派单上下文

### 1.1 上下文载荷结构

向子代理派单时，只发送元数据行（`IMPLEMENTER_DISPATCH`）不足以保证子代理产出与规格一致的实现。Lead 必须在派单时为每个子代理组装完整的上下文载荷，包含以下内容：

| 载荷项 | 来源路径 | 说明 |
|--------|---------|------|
| 架构决策记录 | `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 和 `<Path>{roots.state}/specdev/adr/</Path>` | 当前变更的架构约束和已确认的永久架构决策——子代理必须遵守的设计边界 |
| 领域词汇表 | `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>` 和 `<Path>{roots.state}/specdev/context/</Path>` | 当前变更的术语定义和已确认的永久词汇表——子代理的命名和概念必须对齐，使用 `_Avoid_` 列表中的同义词即视为偏离 |
| 目标规划文档 | `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>` | 里程碑级约束、门禁次序、Definition of Done——子代理理解全局上下文和自身 ticket 在整体中的位置 |
| ticket 文件 | `<Path>{roots.state}/specdev/changes/{change}/</Path>` 下对应 ticket | 验收标准、file allowlist、合同引用、阻塞关系——子代理的直接任务定义，包含「要构建什么」「范围边界」「保留/不动」 |
| 合同验收条目 | 合同文档中本 ticket 覆盖的条目（如激活合同模式） | 编号验收条目及当前状态——子代理必须逐个满足的可检查条件 |
| 实现方法参考 | `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>` | 深层模块设计原则、TDD 红绿循环、双轴审查流程——子代理的实现方法论；子代理开始实现前**必须先读**，与 goal-plan §5 步骤 1 第一项一致 |

### 1.2 派单模板

Lead 向子代理发送的内容应包含以下结构化信息块，而非仅一行元数据：

```
IMPLEMENTER_DISPATCH <n>
  issue: <url>
  gate: <P0|P1|P2>
  allowlist: <files>
  contract_ids: <...>

附加上下文——子代理在开始实现前读取：
  adr: <{roots.state}/specdev/changes/{change}/ADR.md>
  permanent_adr: <{roots.state}/specdev/adr/>
  context: <{roots.state}/specdev/changes/{change}/CONTEXT.md>
  permanent_context: <{roots.state}/specdev/context/>
  goal_plan: <{roots.state}/specdev/changes/{change}/goal-plan.md>
  ticket_file: <{roots.state}/specdev/changes/{change}/ticket/<nn>-<slug>.md>
  implement_ref: <{roots.workflows}/specdev/I-implement/I-implement.md>
```

其中 `<n>` / `<nn>` 为两位零填充纯数字 ticket 编号（如 `01`），不含 `#`。

Lead 在生成子代理时将以上文件作为上下文传入，确保子代理在开始实现前已读取全部载荷。永久 ADR 和永久 CONTEXT 目录可能为空——静默继续。

**完成标准**：每个子代理在启动时收到完整的上下文载荷（ADR、CONTEXT、goal-plan、ticket 文件、合同条目、I-implement 参考），所有路径指向真实存在的文件；IMPLEMENTER_DISPATCH 行和附加上下文已一并传递给子代理。

## 2. 子代理完成后交接

### 2.1 启动 handoff 技能

子代理完成 ticket 实现并通过双轴审查和门禁后（§5 步骤 3-5 完成），Lead 执行交接流程：

1. Lead 调用 `<Path>{roots.workflows}/specdev/common/handoff/SKILL.md</Path>` 压缩子代理的对话上下文
2. handoff 技能产出交接文档，包含：实现了什么、做出的关键决策、与 spec 的任何偏差及原因、测试结果摘要、建议后续 agent 调用的 skills
3. handoff 剥离敏感信息，不重复已存在于 spec/plan/ADR/commit/diff 中的内容——改用路径或 URL 引用
4. 交接文档保存到操作系统临时目录

### 2.2 回写 ticket 文件

压缩后的交接摘要回写到对应 ticket 文件，使后续 agent 可通过 ticket 文件获取实现上下文，无需读取完整子代理转录：

1. Lead 从 handoff 输出中提取关键信息：commit SHA、测试结果、决策与偏差、引用的产物路径
2. Lead 在 ticket 文件末尾追加 `## 实现交接摘要` 小节，包含以上信息
3. 格式：

```
## 实现交接摘要

- **Commit**: <sha>
- **测试结果**: <summary>
- **关键决策**: <decision>（如有）
- **偏差**: <deviation + reason>（如有）
- **产物引用**: <paths to spec/ADR/contract updated>
- **交接文档**: <path to OS temp handoff doc>
```

**完成标准**：每个 ticket 完成后，Lead 已调用 handoff 技能压缩对话；交接摘要已回写到 ticket 文件的「实现交接摘要」小节；后续 agent 可通过 ticket 文件获取实现上下文，无需读取完整子代理转录。

## 3. 合并冲突解决

### 3.1 触发条件

并行执行时，Lead 从多个子代理 worktree 向 base 分支合并时可能产生冲突。尽管 file allowlist 非重叠规则降低了冲突概率，共享依赖（package.json、lockfile）或配置文件仍可能在合并时冲突。Lead 从 worktree finalize（§4.2）或手动合并时检测到冲突即触发本协议。

### 3.2 解决协议

1. Lead 检测到合并冲突后，调用 `<Path>{roots.workflows}/specdev/common/resolving-merge-conflicts/SKILL.md</Path>`
2. 遵循该技能的 5 步协议：
   - **查看状态**：检查 git merge/rebase 当前状态，列出冲突文件
   - **溯源一手来源**：阅读每个冲突的 commit 消息、检查 PR、查看原始 issue/ticket，理解每方更改的原始意图
   - **逐块解决**：尽可能保留双方意图。不兼容时，选择与合并既定目标一致的一方，记录权衡。不发明新行为。务必解决，不执行 `--abort`
   - **运行检查**：按类型检查、测试、格式化的顺序运行自动化检查，修复合并破坏的任何内容
   - **完成合并**：暂存所有内容并提交。如果是 rebase，继续直到所有 commits 已 rebase
3. 解决后，Lead 在合并结果上重跑测试，确认通过后再继续
4. 如果解决需要修改子代理产出，Lead 将变更记录到 `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`：记录冲突的 ticket、冲突文件、做出的权衡

**完成标准**：合并冲突已通过 resolving-merge-conflicts 技能的 5 步协议解决；双方意图已尽可能保留；不兼容处已选择与合并目标一致的方案并记录权衡；自动化检查全绿；合并结果测试通过；如有子代理产出修改，已记录到 LOG.md。

## 4. 并行 Worktree 隔离

### 4.1 为并发子代理创建隔离 Worktree

当 DAG 允许 3-4 个 ticket 并行执行时，Lead 为每个并发子代理创建独立的 git worktree：

1. Lead 对每个并发子代理调用 `<Path>{roots.workflows}/specdev/common/dev-worktree/SKILL.md</Path>` Phase A
2. 每个 worktree 使用唯一分支名：`speculo/specdev/<change>-<ticket-n>`
3. Worktree 路径：`<Path>{roots.state}/specdev/changes/{change}/.worktree-<ticket-n>/</Path>`
4. Lead 在派单前确认：
   - 每个子代理的 file allowlist 与其 worktree 范围对应
   - 两两子代理的 file allowlist 无重叠（共享文件仅 Lead 修改）
   - 每个 worktree 中基线测试通过（基线失败阻断派单）
5. 子代理在其隔离 worktree 内工作，无法看到其他子代理的进行中工作
6. Lead 在 `.status.json` 中记录每个 worktree 的状态：`worktree_status: active`、`ticket_ref`、`base_branch`

### 4.2 子代理完成后的 Worktree 收尾

子代理完成实现并通过审查和门禁后：

1. Lead 调用 `<Path>{roots.workflows}/specdev/common/dev-worktree/SKILL.md</Path>` Phase B
2. Phase B 流程：验证测试通过 → 展示选项（本地合并/PR/保留/丢弃）→ 执行所选选项
3. 默认选项为本地合并：checkout base → pull → `git merge --no-ff <change_branch>` → 在合并结果上重跑测试
4. 合并成功后，从主仓库根目录执行：`git worktree remove <path>` → `git branch -d <branch>` → `git worktree prune`
5. 更新 `.status.json`：`worktree_status: removed`
6. 如果 worktree finalize 期间出现合并冲突，跳转到 §3 合并冲突解决协议

**完成标准**：每个并发子代理在独立 worktree 中工作，分支名 `speculo/specdev/<change>-<ticket-n>`；任意两个子代理的 file allowlist 无重叠；基线测试在 worktree 创建时通过；子代理完成后 worktree 已合并回 base 分支、worktree 目录和临时分支已清理；`.status.json` 反映最终状态。

## 5. 里程碑收尾审查与清理

### 5.1 触发 neat-freak

当 Lead 判断里程碑完成——所有 ticket 关闭、全部门禁通过、§6 里程碑验收仪式完成：

1. Lead 调用 `<Path>{roots.workflows}/specdev/common/neat-freak/SKILL.md</Path>` 执行知识治理收尾
2. neat-freak 跨六个事实面进行一致性核对：
   - **Code** — 当前分支的代码实际实现了什么
   - **Runtime** — 用户实际获得的行为
   - **Docs** — 人类/下游文档是否与现状一致
   - **Rules** — Agent 约束是否单一来源、无死引用
   - **Memory** — 快照是否准确、是否授权修改
   - **Workspace** — 是否有未清理的会话残留
3. 每个事实面标记状态：`verified-current`、`changed-and-verified`、`pending`、`out-of-scope`、`not-applicable`
4. 清理候选：临时计划文档、调试脚本、过期副本（`xxx_old.*`、`xxx_backup/`、`xxx_v2.*`）、孤立 worktree 产物
5. 清理前必须经用户确认——预授权不替代最终报告的确认

### 5.2 收尾清单

Lead 在输出 `MILESTONE_DONE` 前逐项确认：

- [ ] 所有 ticket 的 handoff 摘要已回写到对应 ticket 文件的「实现交接摘要」小节
- [ ] 所有 worktree 已合并且清理——`git worktree list` 无本变更残留
- [ ] 所有临时分支已删除——仅保留 base 和已合并的 change 分支
- [ ] neat-freak 已运行——文档、ADR、CONTEXT 与代码现状一致，六个事实面状态明确
- [ ] `.status.json` 反映最终状态——所有 `worktree_status: removed`
- [ ] `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>` 已追加里程碑完成记录（日期、ticket 数、关键决策、合并冲突及解决摘要）
- [ ] 检查 `<Path>{roots.state}/specdev/adr/</Path>` 和 `<Path>{roots.state}/specdev/context/</Path>`——是否需要将 change 中的新 ADR 条目和术语提升到永久目录
- [ ] 输出 `MILESTONE_DONE` 格式的完成报告

**完成标准**：neat-freak 知识治理收尾已完成——六个事实面状态明确、文档与代码一致、无过期引用；所有 worktree 和临时分支已清理；ticket 交接摘要齐全且可追溯；LOG.md 已记录里程碑完成；永久 ADR 和 CONTEXT 目录已检查并提升新条目（如有）；MILESTONE_DONE 报告已输出。
