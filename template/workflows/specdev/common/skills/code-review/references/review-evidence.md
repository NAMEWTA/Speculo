# 独立审查证据

供 C、I 和最终集成审查使用。只在原 CR、I Evidence、轻量 README 或原整体 Evidence 中记录，不创建 Agent 注册表、状态镜像或完整聊天副本。外部派遣复用已有 TASK/REPORT；原生工具可把必要原始输出及 Lead 核验摘录保存在同一 Markdown 的独立锚点。工具提供的真实身份统一写成 `provider:agent-or-session-id`，如原生工具句柄；不得使用任意角色名或 session 目录名代替。

## 冻结输入

在报告中建立独立的 `review-input` 锚点，用一个 JSON 对象保存 `scope`（review-scope 的完整原始返回值）、`sources` 和适用的 `exclusions`。sources 每项为 `kind: standards|specification|instructions`、项目根相对 `locator` 和实际 UTF-8 原文字节的 `sha256`。locator 可带显式锚点；轻量 README 只摘要其 scope/acceptance 等合同段，不能摘要包含审查记录的整份 README。来源必须覆盖本轮实际规范、标准及适用指令。规范来源 locator 相对明确项目根，代码 scope 相对选定 change 工作区；两者不同时，校验器分别使用 sourceRoot 与 repoRoot，不复制规范进 worktree、不用 .. 穿越 locator。

`Input-SHA256` 为该对象经 JSON.parse 后再 JSON.stringify 的 UTF-8 SHA256，由工具计算，不手写猜测。将同一对象及摘要交给 reviewer。摘要证明输入一致，不证明审查真的发生。

未提交的 Ticket 或 Direct Spec 先读取 <Path>{roots.workflows}/specdev/common/skills/code-review/references/working-tree-review.md</Path>。Git diff 使用实际工具返回的不可变端点；规范/标准和相关指令变化也会使受影响结论失效。

## 最小记录

下列字段和表头置于原 owning 工件；locator 相对当前 change。无 change 时返回相同信息和真实工具输出，沿调用方原报告位置保存，不为审查制造 change。

```markdown
## Independent Review

Input: evidence/T-01.md#review-input
Implementers: provider:actual-implementation-session
Mode: native
Verified-By: provider:actual-lead-session
Verification: evidence/T-01.md#review-receipt

| Axis | Reviewer | Result | Report |
|---|---|---|---|
| standards | provider:actual-review-session | pass | evidence/T-01.md#standards-output |
| specification | provider:actual-review-session | pass | evidence/T-01.md#specification-output |
```

Mode 为 native/herdr/orca/cli。Implementers 包含本范围全部实现及修复者；Lead 参与实现也列入。每轴 Report 指向 reviewer 实际输出的独立段，含 `Reviewer`、`Axis`、`Result`、`Input-SHA256`、`Observed` 字段及具体 findings/依据。不能指回汇总表自证。请求修正或未验证不得改写为 pass；原报告不覆盖。

Verification 指向 Lead 回读真实派遣和返回事实后的独立核验段，含 `Verified-By`、`Mode`、`Reviewers`（逗号分隔真实身份）、`Input-SHA256`、`Result: verified`、`Observed`。Observed 说明工具返回的实际身份、派遣/返回定位、只读范围和核验事实；工具不提供的事实保持未验证。需要深查时沿对应任务 session-locator.json 的 path，结合 TASK 内容检索（旧任务沿原历史 locator），不以 JSONL 文件存在代替审查。

## 完成与复用

完成前回读输入、原报告和工具核验。实现范围内的 reviewer 不独立；一轴失败或 I 缺规范都阻塞完成。改变角色名或重新开启同一实现者的上下文不能绕过。

单票结果以本票实际 checkpoint 为准。多个实现单元组合或冲突修正后，Lead 对实际最终整体范围调用同一独立审查能力，在 <Path>{roots.state}/specdev/changes/{change}/evidence/final-review.md</Path> 记录；跨 change 父编排使用原 <Path>{roots.state}/specdev/changes/{change}/evidence/implementation-orchestration.md</Path>。单 Direct Spec/单票最终输入完全相同可沿用原 Evidence；候选变化先补审再推进父分支或宣布完成。整体输入以最初实施基线为起点，覆盖所有成员实际交付，不只审最后一票。

C 可以只审明确的不可变 commit；I 完成时还必须确认实际工作副本与该交付一致。存在未提交代码时转入 working-tree 审查，不能沿用旧 commit 的通过结论。原 change 的 Markdown 执行记录可在审查后更新；规范与标准段仍需摘要一致。父编排的输入包含原 Implementation Plan/Map 和各成员 Spec，并纳入成员实际实现/冲突修复者及共同起始基线。纯学习或 triage 调查依据原 Ownership/Work 和非实现产物判定，附加 learning 索引不能豁免实现审查。

旧报告可只读展示；作为本轮完成或复用依据时，缺少独立性与固定输入证据就重新审查。静态校验仅验证记录、原文匹配和版本一致性，真实执行仍由 Lead 核对工具事实；工具不可用不能从格式通过推导完成。
