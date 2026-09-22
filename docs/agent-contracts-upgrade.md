# Agent contracts 升级与验收说明

本轮以 v1.0.16 / `bd2fdc9c7a2681d3ab454dcb54410e6bb441f1a6` 为基线。它是代码与资产合同更新，不修改发布版本，不执行 npm 发布或部署，不批量迁移用户活跃状态。

## 先理解三个边界

**发现不是激活。** 根 AGENTS 的受控 bootstrap 指向字面 `speculo/.speculo/workspace.json`、生成 catalog 和按需 runtime guide。catalog 列出实际安装的 commands、skills 和 workflows；只读这些文件不创建 Change、不执行 Work。宿主不读取项目 AGENTS 时，需要用户显式提供入口，本轮没有安装到所有宿主原生目录，也没有声称所有宿主自动发现已经通过实机验证。

**格式不是授权。** 分发 Skill 使用标准字段及 `metadata` 字符串映射。`speculo-invocation=user-only` 是描述性兼容数据，正文和 description 保留显式选择边界；它不替代宿主权限，也不保证未知宿主实现原生的禁自动激活开关。宿主扩展必须由宿主适配器单独验证。独立 Skill 的静态引用用相对链接；私有 workflow Skill 在 compatibility 中声明 workspace/Path 依赖。

**结构不是行为正确性。** `validate-skills` 校验本项目刻意收窄的输出 YAML profile（单行字段、JSON-flow metadata），不假装是完整 YAML 实现。`doctor` 的 healthy 只描述 installation-integrity，明确列出未检查领域状态、真实服务健康和宿主行为。scenario evaluator 永远不再输出数值满分；已提供的轨迹与实际夹具文件能通过 artifact gates，但不认证轨迹的外部来源。

## 操作变化

| 操作 | 新行为 | 迁移注意 |
|---|---|---|
| 非交互首次 init | core-only；`--workflows specdev,learning` 显式增加包 | 自动化脚本应补所需包清单，不再依赖 stdin 类型导致全量安装 |
| 非交互刷新 | 默认更新已安装的受支持包 | 本次不更新的包仍安装、仍有知识引用；`--core-only` 不是卸载/禁用 |
| 项目手册 | 两个受控区块原位替换，重复运行字节幂等，保留非受控内容与换行风格 | 损坏/重复标记、只读文件、软链接/硬链接会阻塞；不自动拆链接。先由 owner 明确处理真实源 |
| doctor | 验证配置、roots、非空 manifest、声明文件 hash、workflow 入口及事务现场 | 老安装缺新 catalog/guide 会建议刷新；只读检查不修复、不删除锁 |
| resolve | 只读展开一个 Path 引用，拒绝未知 alias、未替换 ID、通配符、越界和链接跳转 | 返回路径必须作为参数传入工具，不把引用或未可信文本当 shell 程序执行 |
| recover | `speculo recover [target] --transaction <id>` | ID、host、停止的 owner、目录和 before/after 内容均需匹配；不凭锁龄抢占 |
| docs-sync | audit 默认；update 需修改授权；commit 需提交授权 | update 不推进 state/sidecar；commit 保留原 checkpoint、no-op commit 和 state-file-commit 基线机制 |
| Ops 凭据文档 | 新控制端默认引用，不在常规文档复制真实值 | 旧缺字段状态保持原行为；通过新计划显式设置 false/true，不复用旧批准，不改历史回执 |

目前没有引入独立 enabled 注册表：已安装包都可被动发现，是否激活由请求决定。`installed` 与 `selected-for-update` 已分开，不额外创建一个与实际文件漂移的状态副本。

## Skill ID 与活跃票

name 规范化可能改变入口字节及逻辑名称。旧显示名/前缀名保留在 metadata 的 `speculo-legacy-name`；这不是自动别名执行机制。**不更新任何活跃 Ticket 的绑定，不改写完成 Evidence。** Lead 应先检查现有绑定的路径、ID、旧 SHA 与引用，确认语义变化及用户原授权，再显式重绑未完成票、同步 Map 并运行 tickets/goal 检查。缺必需 Skill 或摘要漂移仍阻塞该票及依赖分支。

只改变外部包装和每次必读入口，不把所有 Work 改成 Skill，不让所有 workflow 使用同一种 schema。SpecDev 逐票 Ready、Direct Spec、安全/集成门、单 writer 与父编排保持；Learning 单课时长、mine unit 上限、每课探针上限和原始回答保真保持；Person 不新增不存在的 README 或无意义状态机。

## 中断刷新恢复模型

事务在任何正式交换前持久化 private journal：安装 before/after 指纹、stage/backup 标识和根手册/.gitignore 的精确 before/after 内容与模式。POSIX 使用文件与目录 fsync；目录交换与配套文件替换按阶段记录。正常异常回滚；进程终止后保留证据。committed 阶段只完成清理，其余已识别阶段恢复旧安装。

测试通过真实 subprocess SIGKILL 覆盖 prepared、old-renamed、installed、external-finalized、committed 五个检查点，验证 runtime 二进制证据保留、错误 ID 不恢复、owner 活跃或并发手册漂移时不覆盖。**不宣称覆盖每个机器指令间隔的掉电、跨文件系统原子事务或对恶意同账户进程的沙箱隔离。** 多文件更新对无锁读者可能短时不一致；协作写入者应尊重锁。

尚未写 journal 的 staging/owner 锁、恢复过程再次终止留下的 recovery.lock、清理窗口中的缺失证据需要人工核对；doctor 会报告，不自动删除。目录必须可信，软链接全部 fail-closed；本轮未增加“授权任意外部链接后写入”的旁路。Windows 不承诺通用目录 fsync，也不以 chmod 模拟 DACL；现有 Ops Windows 私有凭据刷新保护继续保留。

## Ops 实际秘密范围

`plaintext_documentation` 是可选的 plan 输入和 registry policy，纳入计划批准。默认普通 README/OPERATIONS/总册使用 secret_ref；显式 true 可恢复受限明文导出。关闭导出不代表抹除已有历史明文，清理需独立范围与授权。private/credentials.json、运行必要 env、受限 server-files 配置副本仍有真实值；它们不是公开报告或无秘密交付物。

env 和含 credential 占位符的配置为 0600；显式宽权限规划会被拒绝。无秘密 config 保持 0644。非 root 镜像需要 owner/secret 注入时在计划中处理，不放宽秘密为 world-readable。占位符检测不能发现一切未知硬编码秘密，仍需检查计划/源码和真实运行事实。新增测试覆盖默认脱敏、显式明文、旧策略不迁移、配置权限拒绝及 env 实际模式；不替代真实 SSH/Docker/Windows 生产验收。

## 文档披露与冗余清理

Learning 的完整工件布局、Lesson、Homework、综合/归档细则移到四份直接 reference，相关 Work 显式必读。原内容并未摘要丢失。共享 README 留状态、owner、权限、恢复与分支入口。Docs Sync 将每次必需的流程放回 SKILL.md；旧 entry-procedure 只留兼容指针，不再成为新调用方的无条件中转。

自定义 Path 保留在动态工件与私有 workflow 合同中，新增真实只读 resolver；并未大规模改写持久化工件。标准静态 Skill 路径与运行时动态路径分层，不靠重复自然语言解析代替工具。规范化和验证的目标是可靠读取，不据字符变化推导 Token、费用或套餐比例。

## R01–R16 对照

| Review | 实施与验收入口 |
|---|---|
| R01 | 17 个分发 Skill 标准 metadata、旧名说明；validate-skills；Builder 显式调用门同步 |
| R02 | src/agent-files.ts 的被动 catalog/bootstrap/真实 runtime guide；安装测试证明不创建 workflow 状态 |
| R03/R08 | external-files + marker 原位替换；链接、hardlink、readonly、并发、LF/CRLF、重复执行负例 |
| R04 | doctor 的配置、路径、manifest、hash 与 workflow 实查，独立损坏测试及只读 hash 对比 |
| R05 | case-bound trace + 真实 artifact assertions；无关事件、伪 Evidence、禁止效果、路径越界失败 |
| R06 | transaction journal + 显式 recover；五阶段 SIGKILL、owner/ID/漂移阻塞与恢复测试 |
| R07 | Ops opt-in、env/秘密配置最小权限、旧状态兼容与本地真实 executor 测试 |
| R09 | Learning 直接条件引用、Docs Sync 去无条件包装；read-contract/fidelity 测试，不冒充真实模型成本基准 |
| R10 | src/paths.ts 及 resolve 命令；动态私有协议与标准静态引用分层 |
| R11 | PR 全部 check、Node 22.22.3/24、Windows 安装 smoke、Node22 types、去重复 build |
| R12 | historical source inventory、去固定数量门；缺源明确 NOT VERIFIED，--require-sources 严格失败 |
| R13 | 安装与本次更新分离，显式包选项，非交互不隐式全选，知识入口基于安装集合 |
| R14 | audit/update/commit 效果合同；旧提交游标机制不破坏、无授权不升级模式 |
| R15 | 不支持 slash 的外部执行会话、原无 team 串行方案；领域数量不升为全局规则 |
| R16 | 中英文入口说明与 CLI 同步，Person INDEX 例外保留；生成 canonical 只由真实源重建 |

## 验证方法与证据范围

`pnpm check` 执行编译/Node 测试与全部资产门，`pnpm verify-bin` 检查真实 CLI。`pnpm generate-canonical` 连跑两次应无新增 diff；Builder manifest 由原 sync 工具维护。CI 两个受支持 Node 版本执行完整门，Windows 单独执行安装/解析/evaluator smoke；不将 Windows smoke 说成全 Ops DACL/远程部署认证。

`test/fixtures/scenarios.json` 仍是人工场景目录，不伪装成已经执行的模型 benchmark。提供 trace 时每个事件必须有 scenario_id，且每个被评估场景要有 assertions.artifacts；无实际 artifact root 不能通过行为门。支持 exact-text、SHA-256、absence，配合事件顺序和 forbidden_effects。工具 provenance 未认证明确写入输出；不能仅凭模型自述晋升知识或扩大权限。

历史来源 metadata 没有可信 upstream revision/license 的条目仍标明缺失；不补造历史证据。普通 source-inventory 门验证清单及目标存在，只有源文件真实在场才比较源 hash；即便 hash 相同也不等于适配语义正确。保留原版权、许可、来源 hash、reference 和已完成证据，不为“清理”删除溯源。

具体运行记录由 PR 的固定 commit 与 CI job 提供；文档合同测试证明引用可达/边界文字保留，不能替代真实宿主的行为 A/B 实验。不同宿主的发现率、误触发率、实际读取量和长期恢复仍应在固定任务、权限及模型版本下独立评估。
