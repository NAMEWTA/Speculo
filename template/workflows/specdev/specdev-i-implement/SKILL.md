---
name: specdev-i-implement
description: "执行已授权的 Ready Ticket 或获批 Direct Spec，覆盖代码实现与文档维护，产生可回读验收证据；不从模糊需求或只读审查直接写入。"
metadata:
  speculo-kind: work-skill
  speculo-id: specdev/implement
  speculo-domain: specdev
  speculo-contract-version: "2"
---

# 实现与验收

> 激活后读取 `<Path>{roots.workflows}/specdev/common/rules/domain-runtime.md</Path>`。

## 读取范围

先读 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`；从 README/原 Goal 或当前 tickets-map/父 map 定位所需范围、本票、上游约束、项目 Skill 与执行策略。仅展开当前 Ticket 的正文、直接依赖、适用 Skill 和必要恢复证据，不整读知识库。

轻量实现可读取 README 的唯一 scope/acceptance/verification 规格章节，等价于获批轻量 Direct Spec；独立完整 Spec 可按其全部风险门直接实施；保留明确范围、可判定 AC、真实验证及停止条件。存在独立 <Path>{roots.state}/specdev/changes/{change}/spec.md</Path> 时优先读取并拒绝双权威。无需独立票时不造 Ticket/Map；UI 的 DESIGN、批准和真实浏览器门保持。

## 当前票的执行入口

执行先读取 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path>，确定输入，分别选择票据调度、Agent 编排和 change 工作区；完整获批 Spec 不因范围较大而强制拆票，已有 Ready Ticket 不强制补 Goal。执行必须读取 `<Path>{roots.workflows}/specdev/specdev-i-implement/references/implementation-procedure.md</Path>` 和 `<Path>{roots.workflows}/specdev/specdev-i-implement/references/execution-preflight.md</Path>`；执行过程按当前阶段路由设计、TDD、双轴审查和 Evidence；预检单独拥有 Git、workspace、Ready 与授权检查。两者必读，分支参考只在对应 workspace/风险/阶段进入时加载。

UI Ticket 或 Direct Spec 必须读取 <Path>{roots.workflows}/specdev/common/rules/design-contract.md</Path> 与当前批准 DESIGN，核验 design_ref（revision/digest/pages/acceptance）、原型和基线。页面任务按已批准规则实现，不重新选择模板；实际实现证据写入 `Design Conformance`，原型截图不替代生产页面验证。

1. 核验 Ready、授权、owner、真实源与 map 基线；新增计划型票按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 履行必需安全/权限/验收方法并记录证据；必需合同缺失时返回 owner，不猜测。普通可选 Skill 可执行中发现和使用，不为其补造审批或停票。
2. 保持 codebase-design、design-it-twice 和 TDD 的适用门禁；进入对应实现步骤再读其 reference。派单时调用 共享编排方法；Lead 是唯一 SpecDev 状态写入者。
3. Ticket 和 Direct Spec 的全部执行者复用选定 change 工作区；票据调度和 Agent 编排分别决定，同一个 Agent 可连续执行多票，按执行策略逐票预检和验收。E2E 由 Lead 在稳定输入上验收；checkpoint 可为实际 commit 或工作副本快照，提交/合并按明确授权执行。
4. 两轴质量判断与执行者解耦：普通低风险可由主 Agent 自查；高风险/高影响、证据不足或原用户/项目独立要求时采用真正独立 reviewer。安全、并发、公共接口、数据迁移或用户要求全面审查时展开 `<Path>{roots.workflows}/specdev/common/skills/code-review/references/risk-review.md</Path>`；不为省上下文删减必要检查或限制发现数量。
5. 写 Evidence、运行适用校验并回读后才推进状态；必需 Skill 失败、验收失败、越界或归属冲突暂停本票及依赖它的分支。无关工作仍由总控继续，不接管他人事务。

## 专业分支与工程判断

已授权的 documentation Ticket 或获批 Direct Spec，读取 <Path>{roots.workflows}/specdev/specdev-i-implement/references/documentation-procedure.md</Path>；它只替换不适用的代码 TDD步骤，不跳过原预检、两轴审查、workspace、授权或完成门。

失败/重试/取消/恢复读取 <Path>{roots.workflows}/specdev/common/rules/error-handling.md</Path>；异步资源、CI flake、替换测试读取 <Path>{roots.workflows}/specdev/common/rules/test-reliability.md</Path>；工具/prompt/schema/结果变化读取 <Path>{roots.workflows}/specdev/common/rules/agent-experience.md</Path>。沿真实调用入口与消费者两端验证，不能用内部函数或 mock 的通过代替产品路径。检查和证据复用只按原证据规范，不默认重跑全仓。

## 返回总控

存在当前 Goal 时，完成、暂停或重规划后返回 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/SKILL.md</Path>` 的当前 Goal；恢复先核对 HEAD、Ticket/Skill 摘要、证据和未闭合动作，避免重复提交、迁移、发布或正式记忆写入。没有不可变实现证据时不得宣称完成。

## 编排与执行上下文

开始实施或独立审查前读取 <Path>{roots.workflows}/specdev/common/rules/coordination.md</Path>，绑定当前 Ticket/Direct Spec、真实写集与原 owner。task 按分配实施并返回事实，正式状态与 Evidence 由原 Lead 验收后维护。

