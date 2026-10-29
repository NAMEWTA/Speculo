---
name: specdev-t-tickets
description: "将已澄清的 Spec 或等价获批计划拆为可验收的实施 Ticket，并绑定必需项目方法；不用于探索未知需求或执行代码。"
metadata:
  speculo-kind: work-skill
  speculo-id: specdev/tickets
  speculo-domain: specdev
  speculo-contract-version: "2"
---

# 编写计划型 Tickets

> 激活后读取 `<Path>{roots.workflows}/specdev/common/rules/domain-runtime.md</Path>`。

每张票都是可在当前或新上下文执行的 Plan：说明背景、来源、目标、非目标、适用的必需方法、真实顺序约束、验证和失败停止点。Tickets Map 是统一启动与恢复入口，不是静态清单；它不复制 Ticket 的状态权威。

按 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path> 分别决定行为切片、票据调度、执行者分配、派遣通道和工作区。每票可独立执行与验收，不要求独立派遣；同一个 Agent 可连续执行多票。串行/并行只描述票据推进顺序，遵守依赖和用户与 Work/Skill 要求；一个 change 的全部票据复用同一选定工作区，串并行与协作者数量都不触发额外 worktree。

## 读取范围

先读 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`；按相关条目定位上游 Spec/ADR/CONTEXT、代码与项目 Agent 指令，再回读当前拆分所需原文。按任务范围定位相关 Skill 的元数据与触发路由，不预扫描全部技能。

先判断是否确需拆票；单 change、明确范围/AC 且无需 DAG/独立票的任务保留 README 或无票 Goal 清单，不为工具制造 Map。用户明确要求 Ticket 则交付；持续协调或 Deep、跨 change 的实际风险需要相应完整合同，普通只读工具并行不触发拆票或 Goal 升级。

## 从合同到可执行票

1. **输入与范围**：确认目标、非目标、用户指定数量、验收合同和未知项。高影响未决问题回到 G；无 Ready Spec 时，只有用户材料已等价覆盖全部合同才可规划。
2. **地形与方法**：定位真实可维护源、调用方、测试接缝和相关 Skill。按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 区分必需方法与可选知识：只在原 Ticket 绑定用户、安全/权限或验收规定的必需方法；可选知识按需发现并记录实际使用，没有已知必需方法不要求扫描证明或空绑定。
3. **垂直切片**：需要具体拆分时读取 `<Path>{roots.workflows}/specdev/specdev-t-tickets/references/planning-procedure.md</Path>` 与 `<Path>{roots.workflows}/specdev/specdev-t-tickets/references/decomposition-rules.md</Path>`。保留 Prefactor、Expand → Migrate → Contract 和真实 DAG，不按技术层制造空价值任务。
4. **写 Plan**：使用 `<Path>{roots.workflows}/specdev/specdev-t-tickets/assets/ticket-template.md</Path>`。Lite 仅减少不适用说明，不删用户数量、权限、验收或停止条件。所有票必须使用 `plan_contract_version: 1`；旧格式不进入执行。
5. **写总控**：使用 `<Path>{roots.workflows}/specdev/specdev-t-tickets/assets/tickets-map-template.md</Path>`，记录共同背景、必需方法来源、合同覆盖、依赖和明确控制入口；可选知识导航按需保留。进度、Ready 与执行 owner 每次从 Ticket/Evidence 回读，不写入 Map。按 AC 反查至少一个负责验证的 Ticket，暴露未覆盖和重复所有权；依赖环、路径重叠与语义共享资源分别检查，不能用“可并行”文字替代实际 DAG/写集。
6. **Definition of Ready**：读取 `<Path>{roots.workflows}/specdev/specdev-t-tickets/references/ticket-readiness.md</Path>`，并调用 `<Path>{roots.workflows}/specdev/common/skills/plan-quality-review/SKILL.md</Path>`。缺失引用、必需 Skill、可运行验收或权限边界，当前票不可 ready。
7. **与用户核对**：展示全部票、可观察产物、依赖、深度、风险、Skill 和未决问题。保留用户要求的交付数量；已授权自主规划且无关键未知时不重复请求形式确认。
8. **验证、回读和交付**：按下述命令检查，再回读真实 Ticket/Map，报告修改、验证结果和未完成项。规划完成不自动进入实现。

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --stage tickets --repo <project-root> <Path>{roots.state}/specdev/changes/{change}</Path>
node <Path>{roots.workflows}/specdev/common/tools/ticket-control.mjs</Path> --map <Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path> --repo <project-root>
```

用户要求正式 Goal，或需要持续跨票协调、跨 change 集成及迁移/发布 Gate 时交给 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/SKILL.md</Path>`；少量线性或短时独立票无需额外 Goal，可从 map 按已授权范围调用 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`。不得以“精简”为理由静默更换默认工具或少交付。

## 工程义务与证据失效

每票按实际影响列明真实生产消费者、接口两端、文档/升级说明、回归与模型可见输出的责任；删除测试要给出原风险在新测试中的承接。风险及证据选择使用 <Path>{roots.workflows}/specdev/common/rules/evidence-and-verification.md</Path>，失败状态使用 <Path>{roots.workflows}/specdev/common/rules/error-handling.md</Path>。工具定义或上下文变更才加载 <Path>{roots.workflows}/specdev/common/rules/agent-experience.md</Path>。

将有关检查合并进负责该行为的 Ticket，不为每个检查项创建一票。documentation 仍用现有 kind，性能实施引用 R 的测量基线，不增加分类 schema。每票说明 base/head、配置、输入或 Skill 改变后哪些证据需重新验证。

## UI 设计绑定与逻辑证据

UI 拆票必读 <Path>{roots.workflows}/specdev/common/rules/design-contract.md</Path> 与已批准 <Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>。UI Ticket 使用 `ui_change: true` 和 `design_ref: {revision, digest, pages, acceptance}` 固定本 change 设计版本、designDigest、页面 ID 与验收 ID；Map 给出共同基线与读取位置。expected_changes 明确命中 UI 文件时同样需要绑定，不能以缺字段绕过。纯非 UI 票可省略或设 ui_change=false、design_ref=null，不制造 UI 门禁。

将组件复用、页面/状态、响应式与真实浏览器验收放入相应垂直切片；缺确认或摘要漂移返回 P，不让执行者重新选择。LOGIC 证据保留 locator/hash，模拟原型不能自动成为生产实现。
