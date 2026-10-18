---
name: specdev-c-code-review
description: "按用户指定文件或 PR、单 commit、区间、基线冻结真实审查范围，派遣未参与实现的 Agent 执行标准轴与规范轴审查；有效空差异诚实返回，不实施修复或发布。"
metadata:
  speculo-kind: work-skill
  speculo-id: specdev/code-review
  speculo-domain: specdev
  speculo-contract-version: "2"
---

# 代码审查

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/specdev/common/rules/domain-runtime.md</Path>`，再执行本入口。

C 是独立 review 入口，不实施修复。无 change 的明确范围审查可直接返回会话 findings，不创建状态或虚假对象；已有 change 或明确要求保存时才使用相应获批报告路径。它拥有 `<Path>{roots.state}/specdev/changes/{change}/reviews/</Path>`；I 的最终审查由 I 写入 Evidence，不写本目录。

激活时读取 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`，按当前步骤定位输入和证据。

## 输入

- 用户明确的本地文件范围，或 commit、branch、tag、merge-base、PR locator；只有比较历史差异的分支才需要 Git 固定点。
- 可选 source、Spec、Ticket、ADR 和 Goal Plan；UI 范围必须定位已批准 change DESIGN、基线、design_ref 与原型/实现证据。
- 当前仓库代码、commit log 和编码标准。

## 流程

用户明确要求本地文件只读审查时，先按 <Path>{roots.workflows}/specdev/specdev-c-code-review/references/source-files-review.md</Path> 固定文件快照并调用公共审查 Skill；直接返回会话结果，不运行下面的 Git diff/CR stage。缺少 Git 不成为无关初始化理由。未指定文件或比较范围时才澄清范围；不能把 PR/diff 请求降级成文件阅读。

UI diff 按 <Path>{roots.workflows}/specdev/common/rules/design-contract.md</Path> 核对批准版本、页面/状态和 `Design Conformance`。标准轴检查可访问性与运行缺陷，规范轴检查设计一致性；未验证渲染不报告视觉已通过，不通过修改设计文件消除 finding。

1. **解析固定点**：先选择 baseline（共同祖先到 head）、range（两个指定端点）、commit（指定提交与其父）或 pr（远程 PR diff）。PR 先通过 <Path>{roots.workflows}/specdev/specdev-t-triage/references/remote-operations.md</Path> 的 pr-read 获得完整 base/head SHA。调用 <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> 的 `--review-scope --repo <project-root> --mode <mode>`；端点模式传 --base/--head，commit 传 --commit，多父提交明确 --parent。此只读工具冻结本地对象，不抓取、不写状态；根提交没有现有 CR 的 committed baseline 时明确报告限制，不编造父提交。
2. **冻结输入**：保存工具返回的实际 diff argv、fixed_point/head、diff_sha256、路径与 commit log，不把单 commit 扩大到当前 HEAD。引用无效则失败；有效空 diff 返回 no-diff，不启动 reviewer、不造 CR、不声称 approved；正常结束本次 Work 并报告固定输入，change 完成仍按原终点规则判断。有差异才继续。
3. **发现来源**：调用 `<Path>{roots.workflows}/specdev/common/skills/code-review/SKILL.md</Path>`；规范来源缺失时经确认跳过规范轴，标准轴继续。
4. **独立审查**：按公共 Skill 的完整输入与独立身份门复用已有结果；否则默认派遣一位未参与实现的 Agent 分别审两轴，需要并行时使用两位。保存真实工具凭据和原始输出，Lead 核验后记录 Independent Review；能力不足保持 blocked。
5. **持久化（有 change 时）**：选择下一个未占用 `CR-###`，使用 `<Path>{roots.workflows}/specdev/specdev-c-code-review/assets/code-review-template.md</Path>` 写入 `<Path>{roots.state}/specdev/changes/{change}/reviews/CR-###.md</Path>`，原子重读。
6. **验证与路由**：无 change 时核对实际报告与固定范围直接返回；有 change 时使用 `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>` 的 `--stage review` 校验当前 change。无阻塞 finding 时返回完成或 I；局部修复生成/修订 Ticket；规范冲突返回 S/G；无法确定的 blocker 保持 C 可恢复状态。

## 完成标准

- 有差异分支的 fixed point/head 是本地不可变 SHA，diff 语义与用户选择一致；no-diff 独立返回，不运行要求 CR 的 review stage；
- 规范和标准来源发现顺序有记录；
- 审查者与实现者不同、两轴分别判断、固定顺序、未合并排名；
- 每个 finding 有路径、风险、依据和满足条件；
- 报告、状态、验证结果和下一 Work 路径一致；
- C 未修改项目代码或远程状态。

审查接口双方、生命周期、取消/重试、资源释放、真实执行入口与可绕过路径；项目文档和模型可见内容变化分别按 <Path>{roots.workflows}/specdev/common/rules/documentation-standard.md</Path> 与 <Path>{roots.workflows}/specdev/common/rules/agent-experience.md</Path> 核对。base/head、配置或规范输入变化后重新评估受影响结论，不沿用旧 head 的通过。

## 编排与执行上下文

进入实现或审查时读取 <Path>{roots.references}/coordination/coordination-contract.md</Path>；未明确指定时按当前宿主正常执行，App、CLI 等均可，subagent/agent team 属于宿主能力。明确指定 CLI 交互、Herdr 等方式时按选择执行并展开对应参考；编排与 current/worktree 独立，已有授权和选择直接复用。只读取所选工具的当前指南，不固定工具或模型。

`lead` 上下文维护原业务状态和 Evidence；`task` 上下文只处理 Lead 指定目标和阶段，执行同一方法并返回候选、findings、检查和未验证项，可直接写分配的计划、票据、Map 等业务文档；正式状态、审批与 Evidence 由原 owner 在验收后维护，不递归启动 Goal 或擅自跨 CLI 派单；宿主原生协作遵守原写集和共享资源 owner 约束。未曝光到宿主列表不影响读取真实入口。

P 在已授权 run/resume 中完成当前实现、审查、验证和同范围修复后继续下一 Ready 任务，不逐票询问“继续”。只读分析或 plan 不执行。双轴审查必须由未参与本范围实现的 Agent 执行，默认派遣一位原生 subagent；已有编排选择沿用于 review，不能由实现者或参与实现的 Lead 自审替代。
