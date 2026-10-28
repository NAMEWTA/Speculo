# 架构与数据布局

[手册首页](README.md) · [入门](getting-started.md) · [维护者指南](contributing.md)

本页解释安装、数据、所有权与验证机制。第一次使用先看入门；具体操作按领域和 Command 教程选择。

## 产品边界

Speculo 分发可供 AI 读取的提示词、方法、领域合同和确定性工具。AI 使用用户当前环境的工具完成任务。主 Agent 先判断是否值得委派；直接完成、并行普通工具、单个 Subagent 或多个独立执行者都是合法结果。需要委派时在实际能力和授权内选择 host-native、CLI、Herdr 或 Orca；显式 required 约束优先，preferred 仅按允许的 fallback。执行通道与 current/worktree 独立，仅在需要时检查选定工具。

Speculo 不提供模型派遣服务、编排 runner、沙箱或 Run 状态机。可选项目选择保存在 `.agents/speculo/.speculo/coordination/project.json`。实际业务进度继续使用 Goal Plan、Ticket、Evidence 和各领域原有状态；工具返回的 session/attempt locator 只作为证据。

完整获批 Spec 与 Ready Ticket 都可以直接进入实现，无需先补 Goal。无票 worktree 以整个 change 为单元，其执行、风险适配审查和恢复记录保存在原 direct-spec Evidence；Ready Goal/Ticket 使用当前工作区合同。选择 Herdr 时读取已安装 Skill 并核验当前 CLI、环境与权限；缺失时按允许的 fallback 继续或报告阻塞，不擅自安装、登录或启动服务。init/refresh 不接管第三方 Skill。

## 真实源与生成物

| 目录 | 职责 |
|---|---|
| `src/` | CLI、安装事务、路径/YAML/catalog/项目选择验证 |
| `template/commands/<id>/COMMAND.md` | 一次调用及其 references/scripts/assets |
| `template/workflows/<domain>/SKILL.md` | 领域发现、Work 路由、永久知识定位 |
| `template/workflows/<domain>/<domain>-<letter>-<name>/SKILL.md` | 可直接激活的 Work Skill |
| `template/references/` | coordination、retrospective、writing-for-agents 共享方法 |
| `template/lib/` | 从 src 编译的便携 ESM；安装后不依赖仓库脚本 |
| `template/canonical/` | 12 份隔离的单文件分发生成物 |
| `.agents/skills/` | 维护者 authoring skills 的完整正本 |
| `scripts/`、`test/` | 生成、源保真、安装、事务及领域验证 |

目录名与标准 Skill name 一致，使用小写。业务 ID 独立保存于 metadata；目录重构不改变业务身份。领域 manifest v2 注册全部 Work，Command manifest 注册全部 Command。知识树内部的 `INDEX.md` 继续作为知识索引。

领域 Skill 的 AUTO-INDEX 区由生成器拥有；其他内容与 YAML 是源。领域激活规则位于 `common/rules/activation-and-memory.md` 和按需读取的 `domain-runtime.md`。Work 直接调用不重新进入领域 Skill。

## 安装与宿主投影

真实源安装到 `.agents/speculo/`。workspace v2 固定在 `.agents/speculo/.speculo/workspace.json`，含 `layout_version: agents-v2`、安装 UUID、项目根相对 roots。路径解析拒绝遍历、绝对路径、大小写歧义和符号链接逃逸。

可独立选择 `.agents/skills/` 与 `.claude/skills/` 曝光范围。领域/Work 投影原样复制源 YAML，正文要求先读权威入口。Command 生成独立包装；Claude 使用显式调用字段，Agents 使用 `agents/openai.yaml`。这些格式与政策的静态验证不等同于宿主实际调用认证。

投影清单 v3 记录选择、文件路径、业务 ID 和 SHA-256。归属记录授权刷新受管内容，内容、普通权限变化及文件缺失由 init 修复；第三方同名目录、只读文件、hardlink、symlink 和节点类型冲突只阻塞相关投影，报告 warning。关闭曝光删除受管文件，包括本地修改，保留用户附加文件。事务使用规划时实际内容和模式作为 before；规划后并发漂移仍阻止覆盖，失败回滚恢复实际旧文件。

安装采用 staging → 验证 → 原子切换 → 外部受管块/投影 → 验证的事务。事务日志 schema v3，支持两个宿主超过 64 个文件的投影与显式 ID 恢复。事务锁只保护安装，详见[恢复说明](transaction-recovery.md)。未知 runtime bytes 保留，配置按当前 schema 的三方合并规则处理；不自动转换旧版本。

删除当前配置字段时，原文件与清单追加到 CLI-owned `.speculo/back/{uuid}/`；后续刷新保留已有备份。用户附加静态文件不会被自动认领；与新分发文件相撞时停止替换。

## SpecDev 直接 Work 与知识生命周期

安装 API 继续严格验证 workspace；普通 SpecDev Work 使用只读上下文解析器，接受明确 projectRoot、methodRoot 和 stateRoot。后者是各领域共同数据父根，业务写入仍受路径、owner 和相关事务保护。无安装时可从只读方法目录调用，不创建 context 注册文件或依赖业务 CLI。

稳定日期目录名表示 change 身份，README 顶层唯一 Outcome 表示 active/completed/cancelled；实际目录表示归档。简单任务用 README scope/acceptance/verification；无票 Goal 用原计划 Tasks 清单；完整票据保留依赖、写集、逐节点 Ready、必需方法绑定与 Gate，进度归 Ticket/Evidence。跨 change 父图可包含合法 draft 消费者，不阻止独立 Ready 上游；父图本身的目标、成员和公共合同仍须完整。共享执行上下文绑定当前 Change 的实际工作区；Ticket 完成证据保存在 Execution Records，父计划聚合成员原证据。

原 owner 核验实际证据后才能结束；取消保存用户决定、writer/依赖/checkpoint/外部动作处置，不能自动回滚或改票。A 核对 change、ADR、context、docs 与适用 DESIGN，先完成现役维护/发布，再最后整体无覆盖移到 `specdev/changes/archive/<change>`，从目标验证并完成原回执后冻结。发现器只统计 `changes/` 与 `changes/archive/` 的当前 Markdown 工件；历史文件留在原位，不解释成现役状态。

DESIGN 的 current、不可变 revision、三类摘要、真实批准、浏览器证据及专用发布锁/恢复继续有效；来源以稳定 change 与 locator 定位，移动不改不可变字节。普通多文件收尾没有全局原子保证。

`state/docs` 按主题保存当前工程事实，已有项目正文只导航，明确基线请求才建立。A/I/init/project-maintenance 复用 writing-for-agents 的 current-facts-docs；局部维护不创建命令 state，project-maintenance 保持手动全局 audit/update/commit 及其隔离 Git 合同。

当前 SpecDev runtime-contract 允许无 `_state` 种子，安装不补旧骨架。只支持 README Outcome 和当前 Goal/Ticket/执行协议；旧活动、混合协议和未闭合事务阻塞相关操作并保留原件。本版本不再分发转换器、旧状态 schema 或历史 reader。其他领域由各自的现役合同管理。

## 执行方法

选择优先级：当前明确用户要求、既有 Goal 约束、项目 Work+阶段规则、Work 规则、项目默认、Lead。required 工具不可用时阻塞该分支；preferred 只按已允许 fallback 继续。没有项目选择文件时不预扫描工具或创建配置；运行期只懒检查实际需要的候选，保存偏好不构成外部动作授权。

Lead 可自行完成实现、修复和验证，也可按任务类型派遣。上下文顺序为当前工件与 Map、项目 Skill/标准、Ticket 和分支所需资料。任务说明绑定输入、写集、checkpoint、工具能力、授权、完成门与返回证据。

短时同步只读任务可使用可关联的直接工具返回，不创建空 session。长时、异步、跨会话或写入任务按恢复需要在已有 change 的 `sessions/<session>/<task>/` 保存输入、报告和 locator，带聚焦摘要和按需历史入口；文件随 change 归档。session/task 只定位交接材料，工具生命周期仍归工具，正式状态和验收仍归原 Work。见[任务交接指南](agent-handoffs.md)。

实现并发包含 Lead，但 Agent 数量、Ticket 数量和工作区数量不能互推。current workspace 可以有多个写入者处理不相交的授权路径；共享路径、生成输出及 Git index/commit/merge 等全局写操作须唯一 owner 或串行阶段。无已验证释放证据时，idle/超时不能证明前一写入者已结束。Lead 核对实际产物，唯一更新正式状态、Evidence、集成结果和整体 E2E。只读调度输出 eligible、dependencies、conflicts 与非权威 suggested_batch；建议不授予权限，也不限制 Lead 选择其他合法批次。局部阻塞保留证据，继续独立且已授权的任务；持续推进到本次 Goal 的完成边界。

外部网页 ZIP 仍是用户选择时的条件交换方式，保留包清单、hash、唯一尝试与 ZIP-only 返回约束；它不是默认编排模式。

## 共享合同与领域状态

`workflows/workflow-manifest.schema.json` 是当前 manifest 的公开定义；CLI、便携运行库和资产审计复用同一份生成校验器与图/身份检查。能力 profile 只描述声明的宿主事实；`doctor` 不探测工具、不认证模型。未被业务消费的通用 kernel lifecycle、dispatch 和 checkpoint 已移除，领域状态不会被强行映射到同一套生命周期。

## Schema 与验证

| 合同 | 当前版本 |
|---|---|
| workspace / domain manifest / projection | 2 / 2 / 3 |
| install / installation transaction | 4 / 3 |
| 可选 coordination project | 1 |
| SpecDev config / Goal Plan / Implementation Plan | 7 / 8 / 3 |
| SpecDev 整体结论 / Ticket、Map | README Outcome / 3 |
| Learning / OPS / Person / Media state | 2 / 3 / 1 / 1 |

构建与校验以 package.json scripts 为准：`pnpm generate-assets`、`pnpm check`、`pnpm verify-bin`。生成两次须无内容差异。行为回归覆盖正常、失败、冲突、恢复及包隔离；保留来源、许可、真实观察与未验证项，不将机械检查当成业务或模型行为证明。

