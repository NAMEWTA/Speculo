# Speculo 2 项目模型

维护者在 `.agents/skills/` 编辑作者技能完整正本；产品真实源为 `src/`、`template/`、`scripts/`、`test/`。生成物不作为事实源。源入口是一份 prompt/method；AI 使用当前可用工具执行。项目不提供模型派遣 runner、沙箱、编排进程锁或 Run 状态机。

## 源与安装

| 源 | 安装路径 / root |
|---|---|
| template/config.json | .agents/speculo/config.json；roots.config |
| template/commands/id/COMMAND.md | .agents/speculo/commands/id/COMMAND.md；roots.commands |
| template/workflows/domain/SKILL.md | .agents/speculo/workflows/domain/SKILL.md；roots.workflows |
| template/workflows/domain/domain-letter-name/SKILL.md | 同结构的 Work Skill；业务 ID domain/name 保持稳定 |
| template/references/ | .agents/speculo/references/；roots.references |
| template/lib/speculo-runtime.mjs | .agents/speculo/lib/；由 src 生成的便携 ESM 工具 |
| workflow/_state/ | .agents/speculo/.speculo/domain/；roots.state；仅初始化种子 |
| 项目原有 Skill | .agents/skills/；roots.skills；保留第三方所有权 |

workspace v2 位于项目根相对 `.agents/speculo/.speculo/workspace.json`，包含 layout_version=agents-v2、installation_id 与固定 roots。CLI 安装只支持合法当前布局；未知 schema、路径越界、链接或冲突阻塞受影响操作。SpecDev 普通 Work 使用明确 projectRoot/methodRoot/stateRoot，无安装也可使用；已安装时不得放宽 workspace 身份检查。旧活动数据仅经显式转换，旧 archive 保留独立只读 reader，不返回新 writer 对象。CLI 的 staging、锁与恢复日志仅用于安装事务。

## 入口与按需读取

五个领域根 Skill 只做发现、路由和永久知识定位；用户指定 Work 时可直接读 Work Skill，再读 activation-and-memory 与该领域运行合同。根 README/INDEX 不承担激活。

38 个 Work 各自包含职责、必要输入、权威、owner、步骤、完成与停止条件。分支放 references，机械动作放 scripts，schema/模板放 assets；共享业务规则放 common。10 个 Command 各自拥有一次调用、scope、确认、报告及必要 state，资源收纳在该命令目录。

跨领域共享方法放 references。编排读取 coordination-contract，未指定时按当前宿主正常执行（mode: lead），兼容 App、CLI 等；明确指定 CLI 交互、Herdr、Orca 等方式时按选择执行，与 workspace 独立；Herdr 按需安装项目第三方 Skill 后检查受管会话；只有使用时读取当前工具指南。项目选择可选保存在 state/coordination/project.json，不创建执行控制平面。Lead 持续推进已授权 Goal，唯一写正式状态和 Evidence，按原权限处理提交、集成与外部副作用。

已有 change 的外部 CLI/Herdr/Orca 派遣使用 change/sessions/<session>/<task>/ 的 TASK.md 与 REPORT.md：Lead 写输入，执行者写报告，原 Evidence 引用并独立验收。session 用中性 UTC 时间标识一轮编排，task 用递增编号加实际主题标识一次派遣，不镜像工具运行状态；原生协作按需采用，Lead 自行执行不创建。交付前主动定位历史入口并核验主机、会话对应关系和可读性，附本任务检索范围；不可取得时说明原因。接收方按需检索，快照按需保存并随 change 归档；无 change 沿用原报告位置。

## 元数据与生成

Skill 仅用 Agent Skills 标准顶层字段；扩展放 metadata 字符串映射。Work 使用 speculo-id、speculo-domain、speculo-kind=work-skill、speculo-contract-version="2"。name 等于小写目录名，真实 YAML 解析，禁止重复键和不安全 key。

领域 manifest v2 注册入口、全部 Work 和可选阶段。目录、注册和 ID 必须闭合。generate-index 只更新领域 SKILL 的 AUTO-INDEX 路由区，不修改 YAML。用户投影原样复制源 YAML，并强制先读源入口；Command 包装单独生成宿主的显式调用政策。投影选择和文件 hash 在 projections.json v2；不接管第三方文件。

canonical 共 12 份，是隔离的单文件分发。共享规则、portable adaptation 与源模板是事实源；生成与 --check 必须覆盖全部 12 份。不可写平台输出完整 FILE bundle；不伪造持久化。

## 状态与授权

Workflow 仅写领域声明的 namespace；Work 的 change 工件、schema、owner 以各域合同为准，OPS 资源模型不强制变成 Change。SpecDev 新业务整体结论为 README 唯一 Outcome active/completed/cancelled，归档在 changes/archive/<稳定名称>；普通新流程不读写全局 status/change status/Work 调用镜像。config 仅真实工具需要时保留，复杂 Goal Plan 7、Implementation Plan 2 及 Ticket/Map 等有实际消费者的合同不弱化；旧月份 archive 原位冻结。其他领域独立版本化，不强加此模型。并发字段为 max_concurrent_implementations / concurrent_implementation_limit，Lead 实现时也计数，current workspace 单写入者。

Command 报告位于 state/commands/id/YYYY-MM-DD-scope-topic[-NN].md，冲突从 -01 取最小未使用编号，报告不覆盖。只有有恢复需求的 command 才建 state.json。docs-sync sidecar 由命令拥有，延迟创建，不放 workflow/_state。CLI-owned back 不由 prompt 改写。

永久知识先检索 ID/关键词定位，再回读少量原文及 provenance；写前解析 owner/gateway、pending transaction、lock、recovery evidence。未知网关只阻塞该写入。提交、推送、合并、删除分支/worktree、发布、部署、归档移动与不可逆迁移由拥有该动作的入口取得明确授权并回读验证。

## 验证与权威

先读真实调用方、当前 schema 和测试，再改作者参考。按 [验证选择](validation-gates.md) 检查受影响的格式、catalog、links、disclosure 与领域行为；安装/恢复变化才增加对应测试，涉及生成物才生成两次确认无 diff。未知字段和用户 runtime bytes 遵循各 schema 的保留规则，不能为了通过测试减掉业务门禁。记录命令、退出码、未验证宿主行为、恢复入口，不将字符数变化当 Token/额度收益。

当前工程 docs 位于 state/docs 或项目已有负责正文，按主题归属；明确请求才建全面基线，A/I 用共享 current-facts-docs 局部维护，docs-sync 才手动全局整理并拥有 Git/state。A 先核对 change/ADR/context/docs 与适用 DESIGN，维护现役资产后最后移动；无 change 知识维护仅需持久化恢复时建 maintenance 回执。

## Skills Hub 分发

根目录 `skills-hub/` 与 `template/` 同级，保存随 npm 包分发的完整技能包正本。安装器只枚举 `<category>/<skill>/SKILL.md`，嵌套示例作为资源保留；用户项目仅接收勾选的包。它与 `.agents/skills/` 的维护者 authoring skills 和 template 的领域/Work 投影分别归属。Hub 安装、更新、卸载由 CLI 事务及 `.speculo/hub-skills.json` 管理，Work 不代写。
