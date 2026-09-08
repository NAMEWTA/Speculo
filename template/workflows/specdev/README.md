# SpecDev Activation Contract

只在用户明确激活 SpecDev Work 后读取。先选择当前模式，再按条件读取参考；不默认展开所有 Work、历史 change、示例或永久知识。

## 运行时根

工作流：`<Path>{roots.workflows}/specdev/</Path>`；状态：`<Path>{roots.state}/specdev/</Path>`。具体路径遵守 `<Path>{roots.workflows}/specdev/common/rules/path-reference-contract.md</Path>`，不使用内部相对链接、裸文件名或机器绝对路径。

## 工件链与权威

大需求 → W 的 Initiative 候选图 → 每个 change 自己的 G/Grill → S/Spec → T 的计划型 Ticket 与 tickets-map → P 的 Goal → I/实现与 Evidence → Goal 集成验收 → 按需学习/远程 reconcile/归档。

已明确的小请求直接进入适用阶段；无需为了路由而创建 Triage。跨 change 实现由 P 统一管理。

Ticket frontmatter 拥有本票状态、依赖、写集与 Skill 调用绑定；普通 map 是背景/路由/图投影；Goal Plan 拥有 Gate、workspace 和恢复决策。多 change 父 tickets-map 只指向原 Implementation Map/Plan，不复制状态。一个未完成 child 仍只能归属于一个未完成父 Goal。

具体职责与冲突裁决读取 `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>`；新增调用合同读取 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>`。

## 持久化约定

CLI 初始化和刷新保持原 namespace、三方配置合并、schema migrator 与 opaque 文件按字节保留。Work 不写 CLI-owned backup、install 或 managed 元数据。创建、恢复、迁移、关闭或归档时必须读取 `<Path>{roots.workflows}/specdev/common/rules/workflow-state-and-lifecycle.md</Path>`。

永久 ADR/context/research 仅 A 在完成证据、毕业评估和用户确认后通过原网关提升；其他 Work 只读，初始化不写知识内容。

## 启动协议

1. 解析 roots，读取 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`；定位相关 entry 后回读必要原文，不默认整读索引。
2. 读取 `<Path>{roots.state}/specdev/config.json</Path>`；不存在时使用 `<Path>{roots.workflows}/specdev/I-init-setup/I-init-setup.md</Path>`。保留已知配置，不重复询问。
3. 从 `<Path>{roots.state}/specdev/status.json</Path>` 定位用户指定或唯一 active change；多个候选需要真实消歧，无候选按原规则创建。
4. 读取 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`；恢复、创建或状态修改时加载上述状态细则。child 归属未完成父 Goal 时读取对应父 Map/Plan，不接管或覆盖其 owner。
5. current_work 非空则恢复或显式 handoff；暂停保留恢复键，成功才去重更新 works_run 并清空。其他任务冲突只暂停受影响分支，继续独立、已授权工作。
6. 按 Work/模式读取必要参考，完成产物、运行验证、回读真实源与状态后再推进。全局状态仅更新本任务 active/archived 索引。

## 状态字段

全局 status/config 保留 v5；change status 与 Goal Plan 保留 v6；Spec/Ticket/Map 保留 v3，新增 Plan 扩展版本 1；父 Map/Plan 保留 v1。详细字段、枚举、worktree Evidence 与旧工件兼容见状态细则，不为压缩文档另建状态库。

## 路径分配

状态写在当前 change 授权 namespace；实现写在项目授权路径。源文件优先于生成物，保留链接和必要元数据；不改系统或插件缓存。路径归属、共享资源或工作树未知时暂停对应写集。规划/执行/恢复/验收必须读取 `<Path>{roots.workflows}/specdev/common/rules/operating-governance.md</Path>` 和当前步骤声明的所有权规则。

## 副作用边界

规划不授权实现。提交、推送、合并/父分支更新、来源 branch/worktree 清理、部署、发布、远程 Issue 写入、归档移动、永久知识修改和不可逆迁移仍须原入口取得明确授权；文档中的标记不能授予权限。正式记忆写入前检查 pending transaction、lock 和 recovery evidence；不抢占他人事务。

保留原 current 严格串行/direct-parent 默认；worktree 策略在 Goal 创建时按原规则确认，required 使用 source worktree/parent-candidate。Lead 拥有状态、父分支与 E2E；implementation subagent 数量服从 config，只读 review/research/test-observation 不新增数字上限。用户明确的工具与交付数量、UI 默认 3/上限 4、W 每会话最多完成一张调查票均不因精简而改变。

## 场景路由

不清晰的大需求选 W，单 change 的高影响决定选 G，Ready Spec 拆票选 T-tickets，一个或多个 Ready change 的 Goal 选 P-goal-plan；来源冻结/远程回写才选 T-triage。精确条件与全部出口见 `<Path>{roots.workflows}/specdev/common/rules/workflow-routing.md</Path>`。

## Work 条目


<!-- AUTO-INDEX-START -->

- **A-archive-and-consolidate** — 归档与沉淀：校验本地完成与远程 reconcile 门，复用全局归档能力移动 completed change 并提升当前知识，或从代码访谈形成可归档知识 change。
- **C-code-review** — 代码审查：将 commit、branch、tag、merge-base 或 PR 解析为本地不可变固定点，执行隔离的标准轴与规范轴审查并持久化可恢复报告。
- **D-diagnose-bugs** — 诊断 Bug：先建立会在精确症状上变红的紧凑反馈回路，再通过最小化、排名假设和单变量探针确认根因，输出修复契约而不实施生产修复。
- **G-grill-with-docs** — Change 决策访谈：一个已界定 change 仍有产品、领域或架构决定待确认时进行可恢复访谈；跨 change 边界未清晰时先用 W。
- **I-implement** — 实现与验收：执行已授权的 Ready Ticket 或获批 Direct Spec，产生可回读实现和验收证据；不从模糊需求直接写代码。
- **I-init-setup** — 初始化设置：初始化 SpecDev 的语言、配置、全局状态、本地 change 追踪、领域知识布局、验证命令和并发治理。
- **L-learn-change** — Change 学习：在开发完成后围绕当前 SpecDev change 回答问题，并用面向零专业背景读者的 Markdown 与 ASCII 图解持续记录理解。
- **P-goal-plan** — Goal 规划与执行：为一个或多个 Ready change 规划、执行或恢复 Goal；只在用户要求交付编排或已有 map 需推进时使用，不代替需求探索和 Ticket 编写。
- **P-prototype** — UI 设计原型：检测现有项目的 UI 事实，按产品任务推荐并逐步选择设计风格，生成持久化设计系统文档、多风格 HTML 对照和可运行 HTML/CSS/JS 原型。
- **R-review-architecture** — 架构审查：从用户指定范围或 Git 热点扫描代码库中的结构性坏味道、代码 judo 机会和维护性风险，以中文 Markdown 记录高置信候选，并对用户选择的一个方案运行设计树访谈。
- **S-spec** — 编写 Spec：综合已知事实、设计决定、诊断与代码现状，产出以外部行为和验收合同为权威的 Ready Spec。
- **T-tickets** — 编写计划型 Tickets：将已澄清的 Spec 或等价获批计划拆为可验收的实施 Ticket，并绑定真实项目 Skill；不用于探索未知需求或执行代码。
- **T-triage** — 请求分诊：需要冻结外部来源、审计摄入或对 completed change 回写来源 Issue 时使用；已清晰的本地需求不必经本入口路由。
- **W-wayfinder** — 探索大需求与 Change 边界：大需求的 change 边界或实施路线尚不可见时建立探索地图，并分别澄清各 change；已有清晰 Spec 时不触发。

<!-- AUTO-INDEX-END -->


## Common 目录

`<Path>{roots.workflows}/specdev/common/README.md</Path>` 只作定位；按当前 Work 指针选中 rule/schema/tool/skill，不默认展开整个目录。

## 自动校验

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --stage <stage> --repo <project-root> <Path>{roots.state}/specdev/changes/{change}</Path>
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --self-check
```

支持 triage、diagnosis、grill、spec、tickets、goal-plan、implement、learn-change、review、prototype、wayfinder、complete。Goal 总控通过 P 的 map-control 参考使用只读控制器；它不授权或自动执行。完成转换必须读取 `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>`，票全 done 不替代整体验收。
