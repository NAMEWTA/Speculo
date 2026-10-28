# 风险适配审查证据

C、I、文档和最终集成共用此合同。记录放原 CR、I Evidence、轻量 README 或整体 Evidence，不新建配置、审批表、Agent 注册表或状态镜像。审查内容与执行者分离：普通自查复用主 Agent，真正需要独立判断时保留真实独立身份和派遣核验。

## 固定实际输入

在原文 `review-input` 锚点保存一个 JSON：`scope` 为 review-scope 完整返回值，`sources` 为实际 standards/specification/instructions 的项目根相对 locator 与原文 sha256，必要时写 exclusions。代码 scope 相对选定工作区，来源相对 sourceRoot；不复制规范进 worktree、不使用 .. 越界。轻量 README 只摘要 scope/acceptance 等合同锚点，不能摘要包含审查记录的整份自身。

Input-SHA256 是对象 JSON.parse 后 JSON.stringify 的 UTF-8 SHA256。冻结记录支持定位与失效判定，不证明实际审查已经发生。未提交交付按 <Path>{roots.workflows}/specdev/common/skills/code-review/references/working-tree-review.md</Path> 固定实际工作副本，不用 HEAD 冒充脏文件。自查同样核对最终交付，但无需额外 reviewer 或文件目录。

## 原工件内的最小策略与结果

```markdown
## Review
Strategy: self
Risk: low
Independence: not-required
Basis: 局部文档修正，原范围没有独立要求；事实与链接已按实际输入核验。
Input: evidence/T-01.md#review-input
Implementers: provider:actual-implementation-session
Mode: self
Verified-By: provider:actual-implementation-session

| Axis | Reviewer | Result | Report |
|---|---|---|---|
| standards | provider:actual-implementation-session | pass | evidence/T-01.md#standards-output |
| specification | provider:actual-implementation-session | pass | evidence/T-01.md#specification-output |
```

Strategy 为 self/independent；Risk 为 low/medium/high/critical；Independence 为 required/not-required。Basis 说明当次实际判断，不套空话。self 是主 Agent 在当前上下文核对，不声称独立；其 Mode 为 self。真正独立审查使用 Strategy independent 和实际 Mode native/herdr/orca/cli，Implementers 列全部实现及修复者，reviewer 不得在其中。

每轴 Report 指向实际输出独立段，含 Reviewer、Axis、Result、Input-SHA256、Observed 与具体依据。可与原 Evidence 同文件不同锚点，不能指向汇总表自证。Result 为 pass/request-changes/not-applicable，后者须有具体 Reason；必需 AC、测试和风险检查仍由各自原门约束，不以 N/A 隐藏失败。

原 Ticket risk=high/critical，以及原 Spec/Goal/README/Ticket 的 `review_independence: required` 或正文 `Review-Independence: required`，强制独立。可在原范围内用 review_risk 或正文 Review-Risk 记录无 Ticket 的风险；不要求为每次低风险任务新增这些字段。任何已批准独立要求优先于 Evidence 自评，缺少需要的独立能力/真实身份就保持阻塞。策略与规范输入变化时重判适用性。

## 仅独立审查需要的核验

独立策略额外写 `Verification: <原 locator>`，指向 Lead 回读实际派遣/返回事实的段落，含 Verified-By、Mode、Reviewers（真实身份列表）、Input-SHA256、Result: verified、Observed。真实身份使用工具返回的 provider:agent-or-session-id；不能用任意角色名、目录、同一实现者新会话伪造独立性。self 不要求此字段，也不制造空 receipt。

短时只读 reviewer 可使用真实工具即时返回与可靠关联；需要恢复的外部任务复用已有 TASK/REPORT 和 locator，不复制完整聊天日志。Lead 从工具事实核验独立性、范围和原输出，报告自称完成不是证明。`Independent Review` 显式记录仍按严格独立合同校验；不能把它改名来规避策略。

## 完成与有界复用

单票/Direct Spec 固定输入相同可沿用原结果；多票组合、冲突修复或最终整体输入改变时，按整体风险选择 self/independent，在原 evidence/final-review.md 或父 evidence/implementation-orchestration.md 验收，不能只审最后一票。整体范围从最初实施基线开始，涵盖全部成员交付与实现者。父级还核对原 Implementation Plan/Map、成员 Spec 与成员实际审查输入，不允许父记录降低子级独立要求。

C 可只审明确不可变 commit；I 完成还须确认实际工作副本与交付相同。后来脏代码使旧 commit 通过失效，必须重新冻结并核验受影响部分。原 change 的 Markdown 记录更新本身不要求重新审代码，但被摘要的规范/标准仍须一致。不得无差别重跑无影响的检查，亦不得复用已漂移的证据。

历史 CR 保留当时的策略、固定输入与原结果，只读核验记录自身完整性。将其重新采用为当前审查或完成证据时，才按本轮权威范围与风险重验适用性；后来新增的要求不改写旧报告，也不能靠保留旧报告跳过当前门。

完成校验验证记录、原文和输入一致性，不代替语义判断、实际测试、Lead-owned E2E 或重大迁移验收。未验证事项明示，不将静态通过写成实际宿主/模型成功。
