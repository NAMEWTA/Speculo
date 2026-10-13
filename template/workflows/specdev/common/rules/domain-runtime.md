# SpecDev Activation Contract

只在用户明确激活 SpecDev Work 后读取。先选择当前模式，再按条件读取参考；不默认展开所有 Work、历史 change、示例或永久知识。

## 运行时根

工作流：`<Path>{roots.workflows}/specdev/</Path>`；状态：`<Path>{roots.state}/specdev/</Path>`。roots 必须来自已打开的 `<Path>{roots.state}/workspace.json</Path>`，禁止把状态根默认展开成项目根 `.speculo`。嵌套安装下项目根 `.speculo/specdev` 非法。具体路径遵守 `<Path>{roots.workflows}/specdev/common/rules/path-reference-contract.md</Path>`，不使用内部相对链接、裸文件名或机器绝对路径。

## 工件链与权威

大需求 → W 的 Initiative 候选图 → 每个 change 自己的 G/Grill → S/Spec → T 的计划型 Ticket 与 tickets-map → P 的 Goal → I/实现与 Evidence → Goal 集成验收 → 按需学习/远程 reconcile 或 publish/归档。尚未成 Change 的记事项可先 T-triage capture 到 GitHub inbox，再逐条 intake。

已明确的小请求直接进入适用阶段；无需为了路由而创建 Triage。跨 change 实现由 P 统一管理。

Ticket frontmatter 拥有本票状态、依赖、写集与 Skill 调用绑定；普通 map 是背景/路由/图投影；Goal Plan 拥有 Gate、workspace 和恢复决策。多 change 父 tickets-map 只指向原 Implementation Map/Plan，不复制状态。一个未完成 child 仍只能归属于一个未完成父 Goal。

发生职责或事实冲突时读取 `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>`；T 绑定、P 调度或 I 执行 Skill 时读取 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>`。

## 持久化约定

CLI 初始化和刷新保持原 namespace、三方配置合并、schema migrator 与 opaque 文件按字节保留。Work 不写 CLI-owned backup、install 或 managed 元数据。创建、恢复、迁移、关闭或归档时必须读取 `<Path>{roots.workflows}/specdev/common/rules/workflow-state-and-lifecycle.md</Path>`。

永久 ADR/context/research 仅 A 在完成证据、毕业评估和用户确认后通过原网关提升；其他 Work 只读，初始化不写知识内容。

## 启动协议

1. 先打开 `<Path>{roots.state}/workspace.json</Path>` 解析 roots，再读取 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`；定位相关 entry 后回读必要原文，不默认整读索引。
2. 读取 `<Path>{roots.state}/specdev/config.json</Path>`；不存在时使用 `<Path>{roots.workflows}/specdev/specdev-i-init-setup/SKILL.md</Path>`。保留已知配置，不重复询问。
3. 纯初始化和 T-triage capture 按各自无 change 分支执行；其他 Work 从 `<Path>{roots.state}/specdev/status.json</Path>` 定位用户指定或唯一 active change；多个候选需要真实消歧，无候选按原规则创建。
4. 读取 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`；恢复、创建或状态修改时加载上述状态细则。child 归属未完成父 Goal 时读取对应父 Map/Plan，不接管或覆盖其 owner。
5. current_work 非空则恢复或显式 handoff；暂停保留恢复键，成功才去重更新 works_run 并清空。其他任务冲突只暂停受影响分支，继续独立、已授权工作。
6. 按 Work/模式读取必要参考，完成产物、运行验证、回读真实源与状态后再推进。全局状态仅更新本任务 active/archived 索引。

## 状态字段

全局 status 使用 v5，config 与 Goal Plan 使用 v7，change status 使用 v6；Spec/Ticket/Map 使用 v3，Ticket/Map 必须包含 Plan 扩展版本 1；父 Map 使用 v1、父 Plan 使用 v2。详细字段、枚举、worktree Evidence 见状态细则。只接受当前 schema，不转换旧工件。

## 路径分配

状态写在当前 change 授权 namespace；实现写在项目授权路径。源文件优先于生成物，保留链接和必要元数据；不改系统或插件缓存。路径归属、共享资源或工作树未知时暂停对应写集。规划/执行/恢复/验收必须读取 `<Path>{roots.workflows}/specdev/common/rules/operating-governance.md</Path>` 和当前步骤声明的所有权规则。

## 副作用边界

规划不授权实现。提交、推送、合并/父分支更新、来源 branch/worktree 清理、部署、发布、远程 Issue 写入、归档移动、永久知识修改和不可逆迁移仍须原入口取得明确授权；文档中的标记不能授予权限。正式记忆写入前检查 pending transaction、lock 和 recovery evidence；不抢占他人事务。

保留原 current 严格串行/direct-parent 默认；worktree 策略在 Goal 创建时按原规则确认，required 使用 source worktree/parent-candidate。Lead 拥有状态、父分支与 E2E；实现执行者 数量服从 config，只读 review/research/test-observation 不新增数字上限。用户明确的工具与交付数量、UI 默认 3/上限 4、W 每会话最多完成一张调查票均不因精简而改变。

## 场景路由

不清晰的大需求选 W，单 change 的高影响决定选 G，Ready Spec 拆票选 T-tickets，单个已拆票 change 或多个 Ready change 的 Goal 选 P-goal-plan；来源冻结/远程回写/完成后记账/尚未成 Change 的记事项才选 T-triage。精确条件与全部出口见 `<Path>{roots.workflows}/specdev/common/rules/workflow-routing.md</Path>`。

## Work 能力与专业分支

每个 Work 的标准 Skill 文件就是可调用技能入口，保持业务 ID 与恢复键；目录和 name 使用当前 manifest；Work 不等同于一个常驻 worker，也不要求启动任务执行者。按用户意图与已有工件进入，不把全部 Work 串成每次必跑流水线。

R 的 performance 分支先测量再给优化候选；I 的 documentation 分支在原 Ready Ticket/获批 Direct Spec 内维护项目文档；D 的 evidence-triage 只收集事件证据，不宣称根因确认。这些分支使用原 Work、原 owner 和原工件，不修改主持久化 schema。T 继续拥有原远程模式和账本，不另设发布状态库。

同一次任务已加载且摘要未变的规则不机械重复读取；必要安全限制仍在动作前核对，范围/摘要/owner 变化时只重读受影响内容。专业证据的结构检查不认证真实工具或模型行为。

## Work 条目


能力清单由领域 `<Path>{roots.workflows}/specdev/SKILL.md</Path>` 的路由区生成；当前 Work 已选定时按本合同读取所需分支，不重复加载全部入口。


## Common 目录

`<Path>{roots.workflows}/specdev/common/README.md</Path>` 只作定位；按当前 Work 指针选中 rule/schema/tool/skill，不默认展开整个目录。

## 自动校验

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --stage <stage> --repo <project-root> <Path>{roots.state}/specdev/changes/{change}</Path>
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --self-check
```

支持 triage、diagnosis、grill、spec、tickets、goal-plan、implement、learn-change、retro、pr-delivery、review、prototype、wayfinder、complete。Goal 总控通过 P 的 map-control 参考使用只读控制器；它不授权或自动执行。只有进行完成转换时必须读取 `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>`，票全 done 不替代整体验收。

## 远程交付、逻辑原型与复盘

T 拥有 <Path>{roots.state}/specdev/triage-runs/TRI-###.md</Path>，首次独立 CI/安全/发布操作时按模板建立，恢复更新原记录。此 namespace 不占用 change.current_work、不写开发状态、不参与默认归档门。其他入口只复用 T 的 remote-operations 时，原调用方仍拥有报告，不创建 TRI 或 change。

PR 由 T 写入 <Path>{roots.state}/specdev/changes/{change}/pull-requests/PR-###.md</Path>；R-retro 写入 <Path>{roots.state}/specdev/changes/{change}/retro/RETRO-###.md</Path>；P 的逻辑原型写入 <Path>{roots.state}/specdev/changes/{change}/prototypes/LOGIC-NNN/</Path>。均首次按最小未用 ID 创建，更新原子写入并重读；schema 在 common/schemas，验证由 common/tools/validate-specdev.mjs 负责。

config schema v7 增加 github.include_external_prs（boolean，默认 false）与 github.labels（语义名→仓库标签的字符串映射，默认空）。I 初始化当前 v7 配置；CLI 只刷新合法 v7，已有语言、执行、验证与规划配置保留。标签缺失只阻塞对应远程写操作。全局 status v5 与 change status v6 不变。

入口选择：需要活动复盘进入 <Path>{roots.workflows}/specdev/specdev-r-retro/SKILL.md</Path>；包发布进入 T 的 release，Ticket→Issue 仍为 publish。Completed/archived 对象的复盘建立独立 review-only change，不修改原完成状态。新工件版本均为 v1，triage 使用 v2；遇到其他版本保留原文件并停止受影响分支。
