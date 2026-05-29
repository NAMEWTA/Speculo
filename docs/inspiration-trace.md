# Speculo 借鉴对照表

> 本文档记录 `framework/workflows/{dev,ops}/` 在 v2.1 规范约束下，从 `temp/project/` 六个参考框架（flow-kit、gstack、superpowers-zh、spec-kit、oh-my-claudecode、OpenSpec）提炼、内化并落地的设计决策与来源映射，确保每条借鉴可追溯、差异可解释。
>
> 范围：仅记录在本次补完中被 Speculo dev/ops 工作流采纳的条目；被刻意拒绝的模式列在第 3 节"决策记录"。
>
> 生成日期：2026-05-28

---

## 1. 参考项目概览

| 项目 | 核心范式 | 主要借鉴方向 |
|------|---------|------------|
| flow-kit | 严格阶段门控的纯 Markdown 工作流（CHANGE→REQ→DESIGN→TASK→DEV→TEST→REVIEW→INTEGRATION→ARCHIVE） | 阶段门 / 模板字段 / 完成准则 / 失败知识库 / Token 预算 / 测试金字塔 |
| gstack | 23 个专家 Skill + 团队流水线 + 部署→Canary→Document 链路 | 角色红线 / 审查与执行分离 / 部署后观测 / 复盘机制 / Slop 防护 |
| superpowers-zh | 中文翻译 Fork + Skill 质量门槛 + "human partner" 哲学 | 模板内容质量守卫 / 完成准则可证伪化 / 中文表述风格 |
| spec-kit | SDD（Spec-Driven Development）+ 宪法约束 + 多 AI 工具集成 | PRD 结构（User Story + AC + Edge Cases）/ 实施计划字段 / 任务并行标记 / Constitution Gate |
| oh-my-claudecode | 19 Agent 编排 + Git Trailer 决策保留 + 团队流水线 | 写作通道与审查通道分离 / Commit Trailer / verifier 流程 / `team-fix` 失败回路 |
| OpenSpec | propose→apply→archive 轻量制品工作流（25+ 工具兼容） | proposal/specs/design/tasks 四件套结构 / 棕地友好 / 归档闭环 |

---

## 2. 借鉴条目（按 Speculo 目标位置组织）

### dev/01-prd

| 源路径 | 借鉴点 | Speculo 落地位置 | 差异说明 |
|--------|--------|-----------------|---------|
| temp/project/spec-kit/templates/spec-template.md | User Story + Acceptance Scenarios（Given/When/Then） + Edge Cases 三段结构 | dev/_templates/prd-template.md 章节扩展 + dev/01-prd/prd-core.md 引导 | 我们保留 PRD 单文档形态，不拆 plan/tasks 三文件；用户故事使用中文格式 |
| temp/project/spec-kit/templates/spec-template.md | `[NEEDS CLARIFICATION: ...]` 强制不确定性标记，禁止 AI 猜测 | dev/01-prd/prd-core.md "歧义处理"完成准则 | 我们沿用 `[TODO: ...]` 占位语义而非 `[NEEDS CLARIFICATION:]`，因为 Speculo 已定义模板占位符约定 |
| temp/project/flow-kit/templates/CHANGE.md | 影响面 checklist、范围排除（这次不做）、验收线分离 | dev/_templates/prd-template.md 新增"范围与非范围"+"显式排除"小节 | 不引入 v1/v2/out 三段切分（spec-kit 风格更适合 Speculo） |
| temp/project/flow-kit/templates/REQUIREMENT.md | AC 必须可验证 + 用户故事 + 范围切分 + 非功能性需求 | dev/01-prd/prd-core.md 完成准则增加"AC 可验证"硬条 | 不强制 v2/out 段；保留更轻量的"范围与非范围"二分 |
| temp/project/OpenSpec/openspec/changes/ | proposal.md 作为变更前置工件，回答"为什么 / 改什么" | dev/01-prd/prd-core.md 引导文字强调 PRD 必须能回答"为何做、面向谁、做完什么样" | Speculo 不引入独立 proposal 文档，PRD 单文档承载相同语义 |
| temp/project/oh-my-claudecode/CLAUDE.md | deep-interview Skill：模糊需求触发深度访谈 | dev/01-prd/prd-core.md 增加"前置消歧"动作（AI 进入时识别歧义并反问） | 我们不引入独立 Skill，将消歧动作内联到 phase 引导 |
| temp/project/flow-kit/prompts/1-requirement.md | REQ 阶段产物锁定 + 评审决议三档（通过/通过-小修/不通过） | dev/01-prd/prd-review.md 完成准则三档决议 | 完全采纳三档分类 |

### dev/02-design

| 源路径 | 借鉴点 | Speculo 落地位置 | 差异说明 |
|--------|--------|-----------------|---------|
| temp/project/spec-kit/templates/plan-template.md | Technical Context（语言/依赖/存储/测试/平台/性能/约束/规模） 8 字段 | dev/_templates/design-arch-template.md 顶部技术上下文表 | 简化为 6 字段（合并性能/约束/规模） |
| temp/project/spec-kit/templates/plan-template.md | Constitution Check Gate（Phase -1 / Phase 1 双重检查） | dev/02-design/design-arch.md 完成准则增加"对照 .speculo/.config/RULES.md 自检"硬条 | 我们用项目级 RULES.md 替代宪法概念；Gate 在进入实现前触发 |
| temp/project/flow-kit/templates/DESIGN.md | ADR（架构决策记录）+ 数据流 + 风险三段 | dev/02-design/design-arch.md 完成准则要求"关键决策含备选方案对比" + 模板新增"风险与未知"段 | 我们不要求独立 ADR 文件，决策记录内嵌 design-arch.md |
| temp/project/spec-kit/templates/plan-template.md | Project Structure 段：列出 specs/contracts/tests 三类输出 | dev/02-design/design-api.md 完成准则要求"端点清单 + 共享 Schema 同处声明" | 我们保留 design-api.md 单文件而非 contracts/ 子目录 |
| temp/project/gstack/CLAUDE.md | 模型路由：haiku（探索）/sonnet（标准）/opus（架构与深度分析） | dev/02-design/design-arch.md 引导文字提示"复杂系统建议升级 opus 推理" | 不写入 frontmatter，工具适配由 adapters/ 处理 |
| temp/project/flow-kit/prompts/2-design.md | 技术栈预选（≥5 卡供用户选）+ ADR + 数据流 | dev/02-design/design-arch.md 引导"关键决策需备选方案对比" | 不强制 5 卡，由 PRD 复杂度决定 |

### dev/03-implement

| 源路径 | 借鉴点 | Speculo 落地位置 | 差异说明 |
|--------|--------|-----------------|---------|
| temp/project/spec-kit/templates/tasks-template.md | 任务格式 `[ID] [P?] [Story] Description` + `[P]` 并行标记 | dev/03-implement/implement-core.md "可选 tasks/ 子目录" 段 + dev/_templates/plan-template.md 任务表 | Speculo 把 tasks/ 作为 dev workflow 的自治选项（不强制），与 dev/00-INDEX.md 状态扩展字段 `tasks` 对齐 |
| temp/project/spec-kit/templates/tasks-template.md | Phase Setup / Foundational / User Story / Polish 四层任务分组 | dev/_templates/plan-template.md 任务分组建议 | 采纳分层概念，但简化为"基础任务 / 关键路径 / 收尾" |
| temp/project/flow-kit/RULES.md (R4.1) | 每完成一个任务做一次原子提交，格式 `<type>(<change-id>): <subject>` | dev/03-implement/implement-checklist.md 提交规范条目 | 完全采纳；并允许扩展 oh-my-claudecode 风格 Trailer（见下） |
| temp/project/flow-kit/RULES.md (R4.5/R4.6) | Schema 变更必伴随可逆迁移；删除 ≥5 行触发破坏性变更高门槛 | dev/03-implement/implement-checklist.md "破坏性变更"+"Schema 变更"清单项 | 完全采纳，作为 implement 完成准则之一 |
| temp/project/flow-kit/RULES.md (R6.4) | 写新代码前必须 grep 同类抽象，找到就 import 用 | dev/03-implement/implement-core.md "反幻觉与反重复"段 | 完全采纳，作为实现前置动作 |
| temp/project/oh-my-claudecode/CLAUDE.md | Commit Trailer：Constraint/Rejected/Directive/Confidence/Scope-risk/Not-tested | dev/03-implement/implement-checklist.md "可选 Trailer 字段"段 | 列为推荐而非强制；项目可在 .speculo/.config/CONVENTIONS.md 启用 |
| temp/project/flow-kit/prompts/4-dev.md | 每个 DEV 任务 fresh subagent + 自带 verify 命令 | dev/03-implement/implement-checklist.md "完成定义需 verify 输出"项 | 我们不强制"fresh subagent"（Speculo 工具无关），但保留 verify 输出要求 |

### dev/04-test

| 源路径 | 借鉴点 | Speculo 落地位置 | 差异说明 |
|--------|--------|-----------------|---------|
| temp/project/flow-kit/templates/TEST.md | 5 轮测试金字塔（功能/性能/安全/兼容/可观测）+ 跳过必须给理由 | dev/04-test/test-unit.md 与 test-e2e.md 完成准则各拆 5 维 | 不引入独立"金字塔表"，分散到 unit 与 e2e 两个 phase；性能/安全/兼容/可观测的产出归到 e2e |
| temp/project/flow-kit/RULES.md (R5.1) | 测试用例必须从 AC（验收准则）派生，禁止从实现派生 | dev/04-test/test-unit.md 完成准则硬条"测试与 PRD#验收标准一一对照" | 完全采纳 |
| temp/project/flow-kit/RULES.md (R5.2/R5.3) | 不允许 mock 屏蔽真实失败；不允许删除/弱化测试"修复"失败 | dev/04-test/test-unit.md "反作弊"段 | 完全采纳，写入完成准则 |
| temp/project/spec-kit/spec-driven.md | Constitution III · TDD 强制：先写测试 → 批准 → 确认失败 → 实现 | dev/04-test/test-unit.md 引导"推荐 TDD 顺序" | 列为推荐而非强制（Speculo 不引入宪法概念），由 RULES.md 决定 |
| temp/project/flow-kit/templates/TEST.md | UAT（用户验收测试）脚本：前置/步骤/期望/实际 | dev/_templates/test-e2e-template.md 新增"UAT 脚本"段 | 完全采纳 UAT 概念 |
| temp/project/gstack/CLAUDE.md | `/qa` 与 `/qa-only` 分离：报告+修复 vs 仅报告 | dev/04-test/test-e2e.md 完成准则"测试报告与修复动作可分目录归档" | 我们不拆两个 phase；用产物字段区分 |

### dev/05-review

| 源路径 | 借鉴点 | Speculo 落地位置 | 差异说明 |
|--------|--------|-----------------|---------|
| temp/project/flow-kit/templates/REVIEW.md | 双轮审查：第一轮 Spec 合规 + 第二轮代码质量（6 维衰退风险） | dev/05-review/review-code.md 完成准则"决议 + 问题清单按 block/major/minor 三档" | 6 维诊断列为推荐外部工具，不强制内置 |
| temp/project/flow-kit/RULES.md (R3.3) | Reviewer 不允许修改代码，只产 REVIEW.md 和修复任务 | dev/05-review/review-code.md "评审角色红线"段 | 完全采纳 |
| temp/project/gstack/CLAUDE.md | 永远不在同一活动上下文中自我批准；用 code-reviewer / verifier 单独通道 | dev/05-review/05-review.md 完成准则"写作通道与审查通道分离" | 完全采纳；引导文字强调 |
| temp/project/oh-my-claudecode/CLAUDE.md | verifier 通道+ "Verify before claiming completion" + 跨模型 spot-check | dev/05-review/review-code.md "跨模型二次意见"列为可选 | 不强制（Speculo 工具无关），列为可选优化项 |
| temp/project/gstack/cso/ | OWASP Top 10 + STRIDE 安全审计 | dev/05-review/review-security.md 完成准则"按 OWASP 类别分类" | 完全采纳 OWASP 分类 |
| temp/project/flow-kit/prompts/6-review.md | REVIEW.md 标"严重"项必须修复或显式标"已知接受"经人工确认 | dev/05-review/05-review.md 完成准则"block 项 0 容忍，major 项需用户显式签字" | 完全采纳 |
| temp/project/flow-kit/RULES.md (R1.8) | 评审结束 → 抽象错误总结追加到 LESSONS.md | dev/05-review/05-review.md "完成与状态更新"明确写回 .speculo/.config/LESSONS.md | 完全采纳；为 dev workflow 与 .config/LESSONS.md 闭环的核心约束 |

### dev/06-handoff (新增 phase)

| 源路径 | 借鉴点 | Speculo 落地位置 | 差异说明 |
|--------|--------|-----------------|---------|
| temp/project/OpenSpec/openspec/changes/ | propose → apply → archive 三段闭环，archive 时整目录 mv | dev/06-handoff/06-handoff.md 描述与 doc/02-changelog 衔接 + 触发 commands/archive.md | 我们不拆"apply"独立 phase（已由 03-implement 承担），仅承接收尾与归档准备 |
| temp/project/gstack/document-release/SKILL.md | Ship 后文档同步（changelog / API doc / migration guide） | dev/06-handoff/handoff-changelog.md 引导写回 doc/02-changelog | 完全采纳；显式跨 workflow 衔接 |
| temp/project/spec-kit/templates/checklist-template.md | 完工检查清单形式 | dev/_templates/handoff-template.md 改为"交接清单"段 | 完全采纳清单形式 |
| temp/project/flow-kit/prompts/7-integration.md | INTEGRATION 阶段 UAT 失败时最多重试 3 轮，超限暂停 | dev/06-handoff/06-handoff.md 完成准则"未通过 review 的 block 项禁止进入 handoff" | 不复刻"3 轮重试"，借由 review block 项硬阻挡 |

### ops/01-release

| 源路径 | 借鉴点 | Speculo 落地位置 | 差异说明 |
|--------|--------|-----------------|---------|
| temp/project/gstack/ship/SKILL.md | Ship 工作流：版本号/changelog/PR/合并/标签五步 | ops/01-release/release-checklist.md 完成准则"五项前置" | 完全采纳"前置 checklist"思路 |
| temp/project/oh-my-claudecode/commands/release.md | Release 命令作为 Skill 调度入口（不重复写 SKILL） | ops/01-release/01-release.md 引导"硬依赖 dev/05-review 评审通过" | 我们用硬依赖代替命令调度（Speculo 是工作流不是 CLI） |
| temp/project/flow-kit/RULES.md (R4.4) | AI 不能声称"完成"而没有跑过 verify 命令并贴出输出 | ops/01-release/release-checklist.md "verify 输出必贴入"硬条 | 完全采纳 |
| temp/project/gstack/land-and-deploy/SKILL.md | 合并→部署→Canary 验证三段链 | ops/01-release/01-release.md "下游接 ops/02-deploy 与 ops/03-monitor"导航 | 我们拆为独立 phase，不在 release 内完成部署 |

### ops/02-deploy

| 源路径 | 借鉴点 | Speculo 落地位置 | 差异说明 |
|--------|--------|-----------------|---------|
| temp/project/gstack/land-and-deploy/SKILL.md | 部署执行→Canary 守护→失败回滚链路 | ops/02-deploy/02-deploy.md "Deploy / Rollback Plan 两 phase" | 完全采纳"部署 + 回滚预案并存"模式 |
| temp/project/gstack/canary/SKILL.md | 部署后监控循环（无限循环按时间窗收集） | ops/02-deploy/deploy-rollback.md 引导"回滚预案需含触发条件量化指标" | 不在 deploy 内做长循环监控，移交 ops/03-monitor |
| temp/project/flow-kit/RULES.md (R4.5) | Schema 变更必须可逆迁移 | ops/02-deploy/deploy-rollback.md 完成准则"涉及 schema 时必须列出回滚迁移命令" | 完全采纳 |
| temp/project/oh-my-claudecode/CLAUDE.md | execution_protocols：构建/测试 `run_in_background` | ops/02-deploy/02-deploy.md 引导"长操作建议异步追踪" | 不强制工具机制；列为执行建议 |

### ops/03-monitor (新增 phase)

| 源路径 | 借鉴点 | Speculo 落地位置 | 差异说明 |
|--------|--------|-----------------|---------|
| temp/project/gstack/canary/SKILL.md | Canary 模式：发版后按时间窗循环采样关键指标 | ops/03-monitor/03-monitor.md "观测窗口"phase + monitor-checklist.md | 用观测窗口替代无限循环（明确开始/结束/采样次数） |
| temp/project/flow-kit/prompts/M-health.md | 健康巡检报告（4/6 维仪表板 + 0-100 综合分） | ops/03-monitor/monitor-checklist.md "关键指标维度建议" | 我们简化为业务、性能、错误率、可用性四类 |
| temp/project/oh-my-claudecode/CLAUDE.md | verifier 通道：Verify before claiming completion | ops/03-monitor/03-monitor.md 完成准则"观测窗口内未触发回滚才能进入下一变更" | 完全采纳"以观测结果为发版结论"思路 |
| temp/project/gstack/health/SKILL.md | 周期性健康检查报告 | ops/03-monitor/monitor-checklist.md "周期性巡检"列为可选触发场景 | 完全采纳 |

### ops/04-incident (新增 phase)

| 源路径 | 借鉴点 | Speculo 落地位置 | 差异说明 |
|--------|--------|-----------------|---------|
| temp/project/flow-kit/prompts/M-health.md | 事件触发 → 多模式应急（快速/完整/单维深挖） | ops/04-incident/04-incident.md 三档严重度（P0/P1/P2） + incident-response.md 引导 | 完全采纳"按场景选模式"，并对齐通用 P0~P2 严重度 |
| temp/project/gstack/investigate/SKILL.md | 系统性根因调试（5 Whys + 证据链） | ops/04-incident/incident-response.md "根因分析"完成准则 | 完全采纳 5 Whys 思路 |
| temp/project/gstack/canary/SKILL.md | Canary 失败 → 自动回滚触发 | ops/04-incident/04-incident.md 硬依赖 ops/02-deploy/deploy-rollback.md | 完全采纳：incident 直接复用既有回滚预案 |
| temp/project/flow-kit/RULES.md (R1.8) | 事件结束追加 LESSONS.md | ops/04-incident/04-incident.md 完成准则"写回 .speculo/.config/LESSONS.md" | 完全采纳 |

### ops/05-postmortem (新增 phase)

| 源路径 | 借鉴点 | Speculo 落地位置 | 差异说明 |
|--------|--------|-----------------|---------|
| temp/project/gstack/retro/SKILL.md | 项目复盘（含跨项目全局模式） | ops/05-postmortem/05-postmortem.md "复盘报告" + postmortem-template | 完全采纳"项目级 + 跨项目"双层归纳 |
| temp/project/flow-kit/templates/LESSONS.md | 跨 change 失败知识库：DEV 前必扫 | ops/05-postmortem/05-postmortem.md "完成与状态更新"明确写回 .speculo/.config/LESSONS.md | 完全采纳；与 dev/05-review 的 LESSONS 写回闭环统一 |
| temp/project/oh-my-claudecode/CLAUDE.md | Commit Trailer 中 Directive / Not-tested 等指令保留 | ops/_templates/postmortem-template.md "对未来修改者的指令"段 | 用模板段而非提交 trailer 沉淀 |
| temp/project/flow-kit/prompts/6-review.md | 复盘阶段双轮审查（合规 + 质量） | ops/05-postmortem/postmortem-checklist.md "复盘必含项"清单 | 完全采纳双视角检查 |

### doc/ workflows

| 源路径 | 借鉴点 | Speculo 落地位置 | 差异说明 |
|--------|--------|-----------------|---------|
| temp/project/OpenSpec/docs/getting-started.md | 新用户先给可执行接入路径，再给概念解释 | docs/adopting.md + doc/01-readme/readme-structure.md | 我们保留纯 Markdown 框架，不引入 CLI 安装步骤 |
| temp/project/OpenSpec/docs/commands.md | 命令入口与用途集中列出，便于工具发现 | docs/quick-reference.md + framework/commands/status.md | Speculo 命令仍是文档命令，不是二进制 CLI |
| temp/project/gstack/document-release/SKILL.md | 发版后同步 changelog/API docs/migration guide | doc/02-changelog + doc/03-api-doc | migration guide 暂不独立成 phase，破坏性变更写入 changelog/API docs |
| temp/project/spec-kit/templates/spec-template.md | 用户可见条目优先，避免内部流水账 | doc/02-changelog/changelog-format.md | 用 changelog 分组承载用户影响，不复制 spec-kit 文件拆分 |
| temp/project/flow-kit/templates/SUMMARY.md | 总结文档必须事实可追溯，缺失信息显式标注 | doc/01-readme/readme-structure.md | README 缺失事实写"未指定"，不让 AI 猜测 |
| temp/project/OpenSpec/docs/multi-language.md | 面向多工具/多环境的文档入口说明 | docs/quick-reference.md | Speculo 用 adapter 表而非多语言部署文档 |

### commands 与 adapters

| 源路径 | 借鉴点 | Speculo 落地位置 | 差异说明 |
|--------|--------|-----------------|---------|
| temp/project/OpenSpec/AGENTS.md | 用 AGENTS.md 作为跨工具入口，减少工具专有规则漂移 | framework/adapters/agents/AGENTS.md.example | Speculo 保持最小规则，只指向 workflows/commands/.speculo |
| temp/project/oh-my-claudecode/CLAUDE.md | Claude 专有入口透传到共享规则，避免双写 | framework/adapters/claude-code/CLAUDE.md.example | 不引入 oh-my-claudecode 的 agent 编排，只保留透传策略 |
| temp/project/oh-my-claudecode/commands/verify.md | 命令作为快捷入口，实际行为由下层 skill/doc 定义 | framework/adapters/claude-code/.claude/commands/speculo-*.md | Speculo 命令只转发到 Markdown 规范，不调用脚本 |
| temp/project/flow-kit/templates/STATE.md | 状态快照从活动 change 汇总，而非维护全局真相文件 | framework/commands/status.md | Speculo 明确不创建物理 STATUS.json |
| temp/project/OpenSpec/openspec/changes/ | archive 是显式动作，移动目录前要有可审计清单 | framework/commands/archive.md | Speculo 要求用户确认后才移动目录 |
| temp/project/gstack/guard/SKILL.md | 破坏性操作前先列影响面并等待确认 | framework/commands/archive.md | 作为 command 规则内联，不新增独立 guard skill |

---

## 3. 决策记录（含拒绝项）

### 新增 phase 的依据

- **为何新增 `dev/06-handoff`**：借鉴 OpenSpec 的 propose→apply→archive 闭环 + gstack `/document-release` 的发版后文档同步思路。Speculo 原 dev 工作流到 05-review 结束后缺少"评审通过 → 衔接 doc/02-changelog → 准备归档"的胶水阶段；handoff 作为 dev 收尾，确保下游 doc/ops 能机械接管。
- **为何新增 `ops/03-monitor`**：借鉴 gstack `/canary` 与 flow-kit `M-health.md`。Speculo 原 ops 仅有 release + deploy，缺少"发版后短窗口观测、决定要不要回滚"的桥接 phase。明确观测窗口（开始/结束/采样次数）避免 canary 的无限循环陷阱。
- **为何新增 `ops/04-incident`**：借鉴 flow-kit `M-health.md` 应急流程 + gstack `/investigate`。事故响应需要独立 phase 承载严重度分级与根因分析；通过硬依赖 `ops/02-deploy/deploy-rollback.md` 与既有回滚预案复用。
- **为何新增 `ops/05-postmortem`**：借鉴 gstack `/retro` + flow-kit LESSONS.md。事后复盘是把"单次事件"升华为"组织知识"的必经环节；写回 `.speculo/.config/LESSONS.md` 与 dev/05-review 的 LESSONS 写回形成统一闭环。

### 刻意拒绝的借鉴

- **拒绝 spec-kit 的"Constitution"显式宪法概念**：理由——Speculo 已有 `.speculo/.config/RULES.md` 承载项目级硬约束；引入第二套宪法会与 RULES.md 职责重叠。落地方式：把 spec-kit 的 Constitution Gate 思想内化为 `dev/02-design/design-arch.md` 完成准则"对照 RULES.md 自检"硬条。
- **拒绝 flow-kit 的"严格 3 轮自动重试上限"**：理由——Speculo 工作流不预设执行循环次数（工具无关原则），由调用方 AI 工具自行决定。落地方式：用"block 项 0 容忍"硬阻挡替代次数限制。
- **拒绝 oh-my-claudecode 的"19 Agent 编排"复杂度**：理由——Speculo 是 workflow 框架不是 Agent 框架；多 Agent 调度交给 adapter 层（如 claude-code adapter）。落地方式：仅吸收"写作通道 vs 审查通道分离"原则到 `dev/05-review` 完成准则。
- **拒绝 gstack 的"SKILL.md.tmpl 模板生成"链**：理由——Speculo 模板格式约定不需要二级生成（v2.1 frontmatter 已极简）。模板直接是 .md，无 .tmpl 层。
- **拒绝 spec-kit 的 contracts/ + tests/ 子目录拆分**：理由——Speculo 工作流产物按"change-name/"目录单层归档，已通过文件命名（design-arch.md / design-api.md）区分；二级子目录会与 `tasks/` 自治目录冲突。
- **拒绝 superpowers-zh 的"PR 模板 + 94% 拒绝率守卫"**：理由——Speculo 不参与 PR 评审流程，由项目 RULES.md / CONVENTIONS.md 配置。
- **拒绝 OpenSpec 的"独立 proposal.md"文档**：理由——dev/01-prd 单文档 PRD 已能承载 propose 语义；引入 proposal.md 会与 prd.md 内容重叠。
- **拒绝 flow-kit 的"清窗触发四信号"机械化协议**：理由——Speculo 工作流的"上下文管理"由调用方工具负责；workflow 仅声明 phase 边界，不规定 token 行为。落地方式：完成准则中加入"每 phase 完成立即更新 .status.json"，让 phase 切分本身成为自然清窗点。
- **拒绝 oh-my-claudecode 的完整命令库复制**：理由——Speculo 的 command 是规范入口，不是工具集合；复制大量命令会破坏"零运行时、零依赖"原则。落地方式：仅保留 `/speculo-*` 快捷入口并转发到 `commands/` 与 `workflows/`。
- **拒绝把 smoke change 保留在框架骨架里**：理由——用户复制 framework 后应得到空 active 状态，而不是带示例 change 的项目。落地方式：`.speculo/{dev,doc,ops}-status.json` 初始 `active` 为空，示例材料只保留在文档说明中。

### 跨 workflow 共享决策

- **LESSONS 闭环**：dev/05-review、ops/04-incident、ops/05-postmortem 三处 phase 的"完成与状态更新"统一写回 `.speculo/.config/LESSONS.md`，把失败知识跨 change 累积。
- **回滚预案复用**：ops/02-deploy 的 deploy-rollback.md 同时被 ops/03-monitor（观测期触发）与 ops/04-incident（事故响应）硬依赖，避免预案在多处复刻。
- **trailer 字段非强制**：oh-my-claudecode 的 Git Commit Trailer（Constraint/Rejected/Directive/Confidence/Scope-risk/Not-tested）列为推荐而非强制，由项目通过 `.speculo/.config/CONVENTIONS.md` 自选启用。

---

*文档维护原则：每次 workflow 补完或新增 phase 时同步更新本表；条目失效（源路径变化）需修订或删除。*
