---
id: dev/finalize
category: dev
name: Finalize & Archive
description: 在用证据证明 change 真正完成后，改变其状态并归档；没有新鲜验证证据不许宣称完成
keywords: [finalize, verify, complete, archive, 归档, 收尾, 完成验证]
---

# Finalize & Archive 工作流执行指引

本工作流是 `dev/04` 入口，是开发主线的收尾环节（`dev/01` → `dev/02` → `dev/I` → `dev/03` → `dev/04`）。它在 change 的实现完成后，**先用证据证明"真的完成了"，再改变状态并归档**。

## 内置指引

### 核心原则

> 在没有验证的情况下宣称工作完成，这不是高效，而是不诚实。**始终用证据支撑结论。**

### 铁律

```
没有新鲜的验证证据，不许宣称完成
```

如果你在本次推进中没有运行验证命令，就不能声称测试通过、构建成功或需求满足。对这条规则敷衍了事，就等于违背了它的精神。

### 门控函数

在把 change 标记为 completed 之前，对每个结论执行：

```
1. 确定：什么命令能证明这个结论？
2. 运行：执行完整命令（重新运行，完整执行）
3. 阅读：完整输出，检查退出码，统计失败数
4. 验证：输出是否支持这个结论？
   - 否 → 用证据说明实际状态，置 blocked
   - 是 → 带证据陈述结论
5. 只有这时：才能做出结论
跳过任何一步 = 说谎，不是验证
```

### 常见失败模式

| 结论 | 需要 | 不够格 |
|------|------|--------|
| 测试通过 | 测试命令输出：0 failures | 之前的运行、"应该会通过" |
| Linter 无报错 | Linter 输出：0 errors | 部分检查、推断 |
| 构建成功 | 构建命令：exit 0 | linter 通过、日志看起来没问题 |
| Bug 已修复 | 测试原始症状：通过 | 代码改了，假设已修复 |
| 回归有效 | 红-绿循环已验证 | 测试只通过了一次 |
| 代理已完成 | VCS diff 显示变更 | 代理报告"成功" |
| 需求已满足 | 逐项核对清单 | 测试通过 |

### 红线 —— 停下来

出现以下任一情况，**不得进入归档**，回到验证：

- 使用"应该""大概""似乎"
- 验证前就表达满意（"太好了""完美""搞定"）
- 即将归档却没有新鲜验证
- 信任代理的成功报告而未独立核对 VCS diff
- 依赖部分验证或上一轮的旧结果

### 何时使用

当一个 change 的实现（`dev/03` 或 hotfix 修复）已结束，用户要把它**收尾、标记完成并归档**时使用。也可在 `dev/R` 审查通过后衔接进入。

### 与 `archive` 命令的关系

- 本工作流（`dev/04`）面向**单个当前 change** 的引导式收尾：先验证、改状态、再归档。
- `../../../commands/archive.md` 面向**批量**归档多个已 `completed` 的 change。两者共用同一套破坏性归档安全契约（先列清单、用户确认、不覆盖）。

## 阶段

### 1. Completion Verification — 完成前验证（门控）
- 规范：`completion-gate.md`
- 模板：`../_templates/completion-verification-template.md`
- 产物：`completion-verification.md`
- 完成准则：
  - 每条完成结论都有**本次运行**的命令与输出证据
  - 已对照来源（PRD / issue / slices / 用户任务）逐项核对需求清单
  - 无调试残留与推测性功能
  - `completion-verification.md` 无残留 `[TODO:]`
  - `.status.json` 的 `verification_status` 为 `verified` 或 `blocked`

### 2. Merge Back & Cleanup — 合并回原分支与清理（条件，仅 worktree 模式）
- 规范：`../../../skills/worktree-isolation/SKILL.md`（读其 `references/merge-and-cleanup.md`）
- 模板：无
- 产物：合并后的 base 分支、移除的 `.worktree/<change>/` 工作树与隔离分支
- 完成准则：
  - 非 worktree 模式本 phase 标记 `skipped`，不读取该 skill
  - `verification_status: verified` 且用户确认后才执行（破坏性）
  - change 分支已合并回 `base_branch`（冲突即停、不强推），置 `worktree_status: merged`
  - `.worktree/<change>/` 工作树与隔离分支已清理，置 `worktree_status: removed`

### 3. Finalize & Archive — 状态收尾与归档
- 规范：`finalize-archive.md`
- 模板：`../_templates/completion-summary-template.md`
- 产物：`completion-summary.md`，以及归档动作
- 完成准则：
  - `verification_status` 为 `verified`（`blocked` 时不得归档）
  - worktree 模式下，归档在 `base_branch` 上进行（change 目录已随 Phase 2 合并到达 base）
  - `change_status` 先置 `completed`，再随归档置 `archived`
  - change 目录已移动到 `.speculo/archive/dev/<YYYY-MM>/<change>/`
  - 已从 `.speculo/dev-status.json` 的 `active[]` 移除该 change
  - `completion-summary.md` 无残留 `[TODO:]`

## 依赖

- 软依赖：`../03-tdd/03-tdd.md` 或 `../R-review/R-review.md`，scope: same-change
- 硬依赖：无；但归档要求当前 change 通过完成前验证

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `dev_entry` (string) — 固定为 `dev/04`
- `verification_commands` (array) — 本次运行的验证命令及结果摘要
- `requirements_checklist` (array) — 逐项需求核对结果，每项含来源引用与 satisfied | missing | partial
- `verification_status` (verified | blocked) — 完成前验证结论
- `archived` (boolean) — 是否已完成归档
- `archive_path` (string|null) — 归档目标路径
- `worktree_status` (created | active | merged | removed) — 仅 worktree 模式；本工作流在 Phase 2 推进到 `merged` → `removed`（字段定义见 `../../../skills/worktree-isolation/SKILL.md`）

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- 完成验证后写入 `verification_commands`、`requirements_checklist`、`verification_status`。
- 多阶段 slices：完成前验证为 `verified` 后，把 slices 中该阶段 `<phase id="<phase-id>">` 的 `status` 由 `已实现` 置为 `已验证`（承接 `../03-tdd/03-tdd.md`「phase 阶段状态（XML 契约）」的最后一跳；无 slices 则跳过）。
- 验证为 `blocked` 时停在本工作流，回到 `../03-tdd/03-tdd.md` 或 `../H-diagnose/H-diagnose.md` 修复，不归档。
- 验证为 `verified` 且用户确认后：
  - **worktree 模式**：先执行 Phase 2，自动把 change 分支合并回 `base_branch` 并清理工作树与隔离分支（`worktree_status: merged` → `removed`，冲突即停），再在 base 分支上归档；非 worktree 模式跳过 Phase 2。
  - 置 `change_status: completed` → 执行归档 → 置 `change_status: archived`、`archived: true`、写 `archive_path`，并从 `.speculo/dev-status.json` 移除。
- 如有可沉淀经验，在用户或项目规则允许时追加到 `.speculo/.config/LESSONS.md`。
