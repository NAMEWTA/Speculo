# SpecDev Goal 重构与迁移

## 新入口

P-goal-plan 统一 plan/run/resume/replan/verify；G 仍是单 change Grill，P-prototype 仍是 UI 设计。O 已删除，统一使用 P-goal-plan。Triage 只在来源冻结、风险摄入或远程 reconcile 时选用，普通本地需求不再强制经过 intake。W 增加 Initiative 候选 change 图，child 各自进入 Grill/Spec/Tickets，再选择一个或多个 Ready child 给 P。

## 不变的边界

不改 CLI 参数、包版本、Node 范围、包管理器、默认验证工具、现有状态 schema 版本或原记忆写入网关。current 默认严格串行；required 才用独立 Ticket worktree/candidate；Lead 仍拥有状态、E2E 和父分支。UI 候选默认 3/上限 4，W 每会话最多完成一张调查票，用户显式数量优先；没有后台运行能力承诺。

## 有意改变的行为

新建 Ticket/Map 模板新增 plan_contract_version: 1。Ready 票不得保留 unreviewed Skill 扫描；每个适用项目 Skill 要有真实 name、项目路径、SHA-256、阶段、操作、输入输出、失败处理及必要参考。Map 与调用绑定双向一致；required 调用的完成记录必须唯一且 passed。工具只是结构验证，不能证明记录诚实或代替真实工具调用。

新普通 Map 记录 plan_revision、deliverable_policy 和用户明确的 requested_deliverables；completed 时数量证据必须匹配。旧工件刷新仍按原规则保留字节；未完成旧票在新执行前需要由本任务 Lead 显式升级并重新过门禁，不能静默升级或删除已完成证据。旧票不参与新实现时继续可读。

P 的默认 plan 不再把缺少执行授权当作不能形成计划文档的理由；必须将执行门禁保持未满足，不自动 run。父运行期单票 blocked/deviated 不再强制全部父工件 blocked，独立 frontier 继续；父创建前全部输入预检保持。只读 ticket-control 分析下一 frontier；不执行工作、不写状态、不验实际授权、不接管事务。

## 覆盖与活动任务

本次保留旧 O 文件，没有需要删除的源路径。覆盖源码前备份本地未提交改动；不要覆盖自己的 .git、依赖目录或运行状态。编译产物可重建；依赖安装和发布仍按项目原流程。

升级活动任务前先检查唯一 owner、原网关事务、当前 Work、计划版本和 Git 事实。只升级本任务被授权的票：保存基线，补齐真实 Skill 调用/资源/数量，更新 Map 投影，重新过门禁。已完成票保留历史来源和 Evidence，不反向套用当前 Skill 哈希。存在其他任务归属冲突时暂停相关部分，继续独立工作。恢复必须校验变化后的契约和下游闭包，不重放已完成副作用。

## 验证入口

运行 pnpm check、pnpm verify-bin；运行 template/workflows/specdev/common/tools/validate-specdev.mjs --self-check。已安装项目可对选定 tickets-map 调用 ticket-control.mjs --map <map-file> --repo <project-root>；模式、输出限制和恢复合同见 P-goal-plan 的 references/map-control.md。
