# Speculo 2 架构与维护

## 产品边界

Speculo 分发可供 AI 读取的提示词、方法、领域合同和确定性工具。AI 使用用户当前环境的工具完成任务。共享编排方法支持 Lead、Orca、Herdr 和用户指定的无头 CLI；使用时读取工具的当前指南。

Speculo 不提供模型派遣服务、编排 runner、沙箱或 Run 状态机。可选项目选择保存在 `.agents/speculo/.speculo/coordination/project.json`。实际业务进度继续使用 Goal Plan、Ticket、Evidence 和各领域原有状态；工具返回的 session/attempt locator 只作为证据。

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

投影清单 v2 记录选择、文件路径、业务 ID 和 SHA-256。第三方同名目录、人工改动、只读文件、hardlink 和 symlink 冲突只阻塞相关投影，报告 warning；其他源和投影继续安装。关闭曝光只删除校验通过的受管文件，保留用户附加文件。

安装采用 staging → 验证 → 原子切换 → 外部受管块/投影 → 验证的事务。事务日志 schema v3，支持两个宿主超过 64 个文件的投影与显式 ID 恢复。事务锁只保护安装，详见[恢复说明](transaction-recovery.md)。未知 runtime bytes 保留，配置按当前 schema 的三方合并规则处理；不自动转换旧版本。

删除当前配置字段时，原文件与清单追加到 CLI-owned `.speculo/back/{uuid}/`；后续刷新保留已有备份。用户附加静态文件不会被自动认领；与新分发文件相撞时停止替换。

## 执行方法

选择优先级：当前明确用户要求、既有 Goal 约束、项目 Work+阶段规则、Work 规则、项目默认、Lead。required 工具不可用时阻塞该分支；preferred 只按已允许 fallback 继续。没有项目选择文件时不自动探测或创建配置。

Lead 可自行完成实现、修复和验证，也可按任务类型派遣。上下文顺序为当前工件与 Map、项目 Skill/标准、Ticket 和分支所需资料。任务说明绑定输入、写集、checkpoint、工具能力、授权、完成门与返回证据。

实现并发包含 Lead；current workspace 只能有一个写入者。无已验证释放证据时，idle/超时不能证明前一写入者已结束。Lead 独立核对候选，唯一更新正式状态、Evidence、集成结果和整体 E2E。局部阻塞保留证据，继续独立且已授权的任务；持续推进到本次 Goal 的完成边界。

外部网页 ZIP 仍是用户选择时的条件交换方式，保留包清单、hash、唯一尝试与 ZIP-only 返回约束；它不是默认编排模式。

## Schema 与验证

| 合同 | 当前版本 |
|---|---|
| workspace / domain manifest / projection | 2 / 2 / 2 |
| install / installation transaction | 4 / 3 |
| 可选 coordination project | 1 |
| SpecDev config / Goal Plan / Implementation Plan | 7 / 7 / 2 |
| SpecDev global status / change status / Ticket、Map | 5 / 6 / 3 |
| Learning / OPS / Person / Media state | 2 / 3 / 1 / 1 |

构建与校验以 package.json scripts 为准：`pnpm generate-assets`、`pnpm check`、`pnpm verify-bin`。生成两次须无内容差异。行为回归覆盖正常、失败、冲突、恢复及包隔离；保留来源、许可、真实观察与未验证项，不将机械检查当成业务或模型行为证明。
