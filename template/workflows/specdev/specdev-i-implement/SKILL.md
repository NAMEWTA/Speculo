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

先读 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`；从当前 tickets-map 或父 map 定位本票、上游约束、项目 Skill 与执行策略。仅展开当前 Ticket 的正文、直接依赖、适用 Skill 和必要恢复证据，不整读知识库。

## 当前票的执行入口

执行必须读取 `<Path>{roots.workflows}/specdev/specdev-i-implement/references/implementation-procedure.md</Path>` 和 `<Path>{roots.workflows}/specdev/specdev-i-implement/references/execution-preflight.md</Path>`；执行过程按当前阶段路由设计、TDD、双轴审查和 Evidence；预检单独拥有 Git、workspace、Ready 与授权检查。两者必读，分支参考只在对应 workspace/风险/阶段进入时加载。

1. 核验 Ready、授权、owner、真实源与 map 基线；新增计划型票按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用绑定能力并记录证据。票缺调用契约时先由 Lead 补齐，不猜测。
2. 保持 codebase-design、design-it-twice 和 TDD 的适用门禁；进入对应实现步骤再读其 reference。派单时调用 共享编排方法；Lead 是唯一 SpecDev 状态写入者。
3. current 模式串行使用当前 workspace；required 模式使用独立 worktree，E2E 由 Lead 在 parent-candidate 完成。实现 commit、父分支推进和集成均需真实授权。
4. 安全、并发、公共接口、数据迁移或用户要求全面审查时展开 `<Path>{roots.workflows}/specdev/common/skills/code-review/references/risk-review.md</Path>`；不为省上下文删减必要检查或限制发现数量。
5. 写 Evidence、运行适用校验并回读后才推进状态；必需 Skill 失败、验收失败、越界或归属冲突暂停本票及依赖它的分支。无关工作仍由总控继续，不接管他人事务。

## 专业分支与工程判断

已授权的 documentation Ticket 或获批 Direct Spec，读取 <Path>{roots.workflows}/specdev/specdev-i-implement/references/documentation-procedure.md</Path>；它只替换不适用的代码 TDD步骤，不跳过原预检、两轴审查、workspace、授权或完成门。

失败/重试/取消/恢复读取 <Path>{roots.workflows}/specdev/common/rules/error-handling.md</Path>；异步资源、CI flake、替换测试读取 <Path>{roots.workflows}/specdev/common/rules/test-reliability.md</Path>；工具/prompt/schema/结果变化读取 <Path>{roots.workflows}/specdev/common/rules/agent-experience.md</Path>。沿真实调用入口与消费者两端验证，不能用内部函数或 mock 的通过代替产品路径。检查和证据复用只按原证据规范，不默认重跑全仓。

## 返回总控

完成、暂停或重规划后返回 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/SKILL.md</Path>` 的当前 Goal；恢复先核对 HEAD、Ticket/Skill 摘要、证据和未闭合动作，避免重复提交、迁移、发布或正式记忆写入。没有不可变实现证据时不得宣称完成。

## 编排与执行上下文

Lead 自行执行或当前阶段需要交接任务时，读取 <Path>{roots.references}/coordination/coordination-contract.md</Path>，按用户指定的 Lead、Orca、Herdr 或无头 CLI 方式操作。只读取所选工具的当前指南；不固定编程工具或模型。

`lead` 上下文维护原业务状态和 Evidence；`task` 上下文只处理 Lead 指定目标和阶段，执行同一方法并返回候选、findings、检查和未验证项，不修改正式 Ticket、Map、Goal、Evidence，不递归启动 Goal 或交接其他任务。未曝光到宿主列表不影响读取真实入口。

P 在已授权 run/resume 中完成当前实现、审查、验证和同范围修复后继续下一 Ready 任务，不逐票询问“继续”。只读分析或 plan 不执行。独立审查 required 时不能以 Lead 自审替代。
