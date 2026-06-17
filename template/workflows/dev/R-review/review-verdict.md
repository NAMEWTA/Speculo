# Verdict & Next Steps Phase

## 输入

- `speculo/.speculo/dev/<change>/review-report.md`（三维度 findings）
- `.status.json` 的 `severity_summary`

## 产物

- `speculo/.speculo/dev/<change>/review-verdict.md`，由 `../_templates/review-verdict-template.md` 填写

## 填写引导

1. **严重度汇总**：统计三维度合计的 P0 / P1 / P2 / P3 计数。
2. **整体裁决**，依据汇总给出其一：
   - `REQUEST_CHANGES`：存在任何 P0，或存在合并前应修复的 P1
   - `COMMENT`：无 P0/P1，但有值得跟进的 P2/P3
   - `APPROVE`：无阻断项，至多少量 P3
3. **Clean-review 诚实声明**（无论是否发现问题都必须写）：
   - **检查了什么**：覆盖到的文件 / 模块 / 维度（worktree 模式下须确认已覆盖 `base_branch..change_branch` 的每个 commit）
   - **未覆盖什么**：未审的区域及原因（如 "未验证数据库迁移"、"大 diff 仅抽样审查了 X 模块"）
   - **残留风险**：建议补充的测试或后续验证
4. **后续选项**：向用户给出明确选项并等待选择，未经确认不实施修复：
   1. 修复全部
   2. 仅修复 P0 / P1
   3. 修复指定项（由用户点名）
   4. 不改动，审查到此为止
   - 若选择修复且仓库支持，移交 `../03-tdd/03-tdd.md` 的红绿重构循环
   - 若选择不改动且 change 已完成其使命，可移交 `../04-finalize/04-finalize.md` 归档
   - 独立进入时（无上下游工作流），以上移交均为可选推荐，由用户决定后续路径
5. 用户选择修复时，移交 `../03-tdd/03-tdd.md` 的红绿重构循环执行，并在该 change 内继续维护状态。

## 边界

- 不修复代码；本阶段只裁决与确认。
- 不夸大或弱化裁决；裁决必须与 `severity_summary` 一致。
- 不把"未覆盖"伪装成"无问题"。

## 完成准则

- `review-verdict.md` 含整体裁决、严重度汇总、clean-review 三项声明、后续选项
- `review-verdict.md` 无残留 `[TODO:]`
- `.status.json` 写入 `review_verdict`，`review_status: completed`
