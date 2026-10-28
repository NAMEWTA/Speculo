# Change Completion

本规则是 change 整体完成或取消的唯一合同。README 的 Outcome 只是结论，必须能沿原工件重建证据；结束不等于已归档。

## 完成门

实现型完成必须按 <Path>{roots.workflows}/specdev/common/skills/code-review/references/review-evidence.md</Path> 有覆盖实际最终交付的风险适配双轴验收证据。普通低风险可由主 Agent 自查，高风险或原用户/项目要求独立时必须有真正独立 reviewer。多单元组合使用整体风险与审查；单单元固定输入相同可复用，未提交内容使用工作副本快照。非实现学习、复盘及取消沿各自等价验收，不制造代码审查。


一个 change 只有同时满足以下条件才能 completed：

1. 所有计划内 Ticket 为 done，或因权威事实无需改动而有依据地 cancelled；Direct Spec/非实现流程有等价验收。
2. 每票的原执行记录 verified，实际改动、AC、checkpoint、适用审查策略和验证证据完整；Direct Spec 有等价证据。未提交工作副本快照可作为交付，不强制 commit 或合并。
3. 每个行为有 Lead Evidence，全部 Spec 合同与 Goal Gate 可定位。
4. 选定 change 工作区中的适用单元/组件、集成/回归和 Lead-owned E2E 已通过；not-required 有真实理由。
5. 迁移、发布、监控、恢复和不可逆批准已完成或明确不适用。
6. 没有未批准 deviation、blocker、unverified 或活动 writer；明确承诺的 Git/外部交付按原约定完成或获明确处置，不虚构未发生的集成。
7. Ticket、Map 的依赖/导航、Goal Plan、Evidence、README 与实际 Git 一致；不复制单票状态。

UI 实施还需 Evidence 对照已批准 change DESIGN、固定基线与页面/状态验收；原型截图不代替实现的真实渲染。设计漂移或未确认例外按 <Path>{roots.workflows}/specdev/common/rules/design-contract.md</Path> 返回 owner，不能以票全 done 消除缺口。

只有结论而无实际改动/验收证据不能 Done；无需改动须有权威依据并 cancelled，不用 empty commit 代替。

L 新建的学习专用 change 属于非实现终点：以 README 的学习 scope、逐 AC 实际验证及 learning 图解/索引完成轻量验收，由 L 原 owner 在本轮交付后结束。已有开发 change 的学习材料不替代其实现完成门；向 completed/cancelled 对象续加学习图解不重开或重新判定原 Outcome。学习的选择与恢复由 <Path>{roots.workflows}/specdev/specdev-l-learn/SKILL.md</Path> 负责。

父实现 change 还必须满足 `<Path>{roots.workflows}/specdev/common/rules/parent-implementation-orchestration.md</Path>`：全部成员 completed，Implementation Map 与 Implementation Plan completed 且 revision 一致，跨 change 全套验证通过，`<Path>{roots.state}/specdev/changes/{change}/evidence/implementation-orchestration.md</Path>` 完整，没有活动派单、candidate、serialization lock 或未裁决冲突。父完成不自动归档或移动任何成员。

## 转换 Owner

- 有 Goal Plan：其唯一 Lead 在关闭最后 Gate 后拥有转换；
- 无 Goal Plan 的 Ticket/Direct Spec：当前 I-implement 主会话 owner 拥有转换；
- 非实现型终点：最终验收工件 owner 使用本规则。
- 父实现 change：Implementation Plan 的唯一 Lead 在全部成员与 aggregate gate 关闭后拥有转换。

Owner 依据来自原 Goal/Implementation Plan、I 的真实会话或非实现验收工件，不由调用方任意声明。门全部通过后，重验 README 旧字节和证据，由同一 owner 原子更新 <Path>{roots.state}/specdev/changes/{change}/README.md</Path> 唯一 `Outcome: completed` 行并链接完成依据，再重读；不连带改票时间戳或复制进度。轻量任务由 README 的范围、逐 AC 实际结果、适用验证和下一步承接等价证据；用户要求的独立工件和复杂实现门不得省略。

## 远程来源与归档

远程动作不参与本地完成判定。Delivery `external_action` 为 `pending-close`/`close-failed` 时先 reconcile；`closed`、`waived` 或 `not-applicable` 才允许 Archive。<Path>{roots.state}/specdev/changes/{change}/publish.md</Path> 的 `publish_action` 为 `pending`/`publish-failed` 时先恢复或结束 publish；`not-requested`、`published` 或 `waived` 才允许 Archive。`not-requested` 是默认，未点过 publish 的 change 不被新模式绑架。归档后工件只读。

**完成标准**：完成声明可由原工件、真实工作区与验证重建，只有一个 owner；完成不自动授权提交、合并或工作区清理。

## PR 归档门

独立 R-retro 使用 RETRO 报告与原升级计划验收，不为复盘新建 change；关联已有 change 不替代其原完成门。

PR requested=true 且 status=planned/failed 时阻塞归档；delivery_target=ready 时 draft 也保持未闭合。draft 目标可由 draft/ready 满足，ready 目标只由 ready 满足；waived 须记录放弃交付的授权与原因。创建成功不等于已授权 merge。独立 DEL 不因关联 change 就参与完成/归档门。

## 整体取消

只有真实用户取消请求发生时，由原完成 owner 核对并记录：决定来源、范围和时间；未交付内容与已落地代码/数据/设计/远程影响；活动 writer 已停止或明确交接的证据；父子依赖、未集成 checkpoint/candidate 的处置；已承诺外部动作的结果或明确放弃/转交依据；后续 owner、保留材料和恢复限制。记录放 README 或原 Goal 决定章节并链接，齐全后重验旧字节，写入唯一 `Outcome: cancelled` 并重读。

A 只验证取消结果，不代替用户取消。单 Ticket cancelled 不推导整体取消；不批量改票为 done/cancelled，不自动回滚、远程关闭或删除 branch/worktree。未知外部结果继续阻塞归档；超时/无响应不能证明 writer 结束。已发布 DESIGN revision 保留，未实现候选随 change 保存；cancelled 不满足 promotion 的 implemented 完成来源门。


## 轻量证据与取消的只读语法

轻量 README 使用唯一 scope/acceptance/verification 显式锚点，acceptance 列可观察的 AC-n。完成时 verification 表使用 `AC | Result | Evidence`（可选 SHA256 列），每个 AC 恰一行 `passed` 和可回读实际证据 locator；提供摘要时必须匹配真实字节。证据可用 #anchor 指向同 README 的独立证据段，不能指向 Outcome/Ownership 或该结果声明自身，记录 `Method`、`Source`、`Observed`、`Result: passed`；有 `Command` 时须 `Exit: 0`。实际运行后才形成，不为 active 任务先造空证据；静态字段只供回读，不认证语义真实性或授权。

无 Goal 的 owner 在 README `## Ownership` 写 `Owner` 与 `Evidence`；后者指向实际会话/交接原文或同 README 的独立证据锚点，其 `Owner` 或 `Session` 必须匹配。若动作绑定 `Work`，原证据必须同值；不是每 Work 调用登记。

取消在 README `<a id="cancellation"></a>` 下保留 `Source`、`Scope`、`Time`（实际 ISO 时间）、`Confirmed-By`（原 owner）、`Undelivered`、`Landed`、`Writers`、`Dependencies`、`Checkpoints`、`External`、`Next`。Source 指向真实取消决定原件或同 README 的独立原请求锚点，不能以取消结论自证。Writers 为 `none: <依据>` 或 `stopped: <停止/交接证据 locator>`；后者原件须有 `Writers: stopped` 与真实 Observed。Dependencies/Checkpoints/External 使用 `none|resolved|transferred|waived: <处置依据>`，不能把未知写成已解决。Ticket 或 Direct Spec 的 active/review/blocked 执行记录仍须原 owner 处置，不由取消声明抹掉。

独立 Spec 的无票 Direct Spec 使用原 evidence/direct-spec 的 `## Acceptance Verification` JSON array 逐 AC 回读实际结果：id/result/method/source/observed；command 存在时 exit 为 0，外部 evidence 引用须有匹配 sha256，内联观察无需另建文件。空 Evidence、仅标题或 passed 自评不通过。`--stage complete` 只判本地完成；A 移动前使用 `--stage archive-ready` 同时核对对应 completed/cancelled 门和已承诺远程交付，目标移动后再使用 archived。

