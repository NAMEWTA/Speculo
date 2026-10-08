# SpecDev 与 Skills 升级交付记录

审查日期：2026-10-08。升级基线：`4da7513a191223aa5173b4adf0c7dfca155f1d01`。初始实施为源资产、CLI 刷新和验证，版本为 1.0.19，未做远端写入。随后用户明确授权拉取、提交、推送和补丁发布；1.0.20 的整合与发布前验证见下方补充记录。

## 实际结构

- SpecDev：15 个 Work，新增 `specdev/retro`，其余 Work ID 保留。
- 顶层 Skills：9 个。全部分发树含 workflow common Skills 共 16 个。
- `github-npm-ops` 删除，远程协议、脚本与发布分支由 T-triage 唯一维护，无转发 Skill 或长期别名。
- `speculo-retro` 改为 `retrospective`；`writing-great-skills` 改为 `writing-for-agents`。
- 其他 workflows 保持原职责；README 同时校正已存在的 Ops 5 个 Work 计数。

最终顶层 Skill 为 archive-and-consolidate、docs-sync、engineering-standards-builder、git-history-squash、optimize-codex-config、source-code-zip、retrospective、upstream-fork-sync、writing-for-agents。

## 来源和保真

实施开始重新读取上游 HEAD，仍为 `f3fc5632f401156837ee3872f14fe33ccf1024ea`，因此没有额外 HEAD 差异批次。来源清单覆盖 38 个 Skill 入口及 110 个实际源文件；包括附件与许可。固定版本文件已经在线逐一校验 SHA-256。

- [38 项处置矩阵](upstream-matrix.md)：吸收目标、保留职责或排除理由。
- [可机读来源清单](../../scripts/specdev-upstream.json)：revision、路径、hash、许可、处置目标。
- [许可与 PR 二级归属](../../THIRD-PARTY-NOTICES.md)：随 npm 包分发，保留 Matt Pocock MIT 与 Dex Horthy/show-me 归属说明。
- [历史 26 项来源证据](../../scripts/specdev-source-map.json)：原 revision 不可验证，保留原 source 名称，不冒充精确历史差异。新清单另列 14 项未登记能力及 2 个已移除路径。

来源 hash 验证、静态引用验证与行为测试是不同证据。`validate-source-parity` 的退出码 0 只表示历史清单结构和目标有效，其输出明确说明旧源 hash 未验证；新源使用 `validate-upstream`。

## github-npm-ops 完整迁移

以下路径均相对于 `template/`。删除的是旧分发文件，不改写 CHANGELOG 或历史审查记录。

| 旧 Skill 内容 | 新落点与变化 |
|---|---|
| SKILL、entry-procedure | workflows/specdev/T-triage/T-triage.md：十模式路由 |
| issue-transport 合同、issue-transport.mjs | T-triage/remote-operations.md、scripts/github-transport.mjs |
| issue-pr-triage | queue/intake、references/issue-pr-policy.md 与既有 classification/public-projection |
| ci-and-security-ops | ci-security-protocol.md |
| preflight-checklist、publish-detection | release-preflight.md，目标三态、项目实际版本/包/渠道/工作流 |
| package-json-checklist | release-preflight.md、references/workflow-yaml-reference.md 的包检查 |
| release-pipeline、version-bump-flow | release-protocol.md，固定发布 commit、tag、run 和逐目标回执 |
| failure-recovery、troubleshooting-playbook | release-recovery.md，先查询实际结果再续做 |
| setup-npm-token | references/release-authentication.md，OIDC 与现有 Token 分开核验 |
| workflow-yaml-reference | 同名 T references，按项目证据采用，示例不假定默认分支/渠道 |
| release-notes-injection | 同名 T references，保留项目 CHANGELOG 与正文来源 |

T 的模式为 queue、intake、reconcile、publish、capture、pr-delivery、ci-security、release-preflight、release、recover。publish 仍是 Ticket→Issue；release 是 npm/GitHub Release。

旧五项 transport 的参数语义和 JSON 核心字段保留，新增 pr-create/pr-update/pr-ready。脚本只执行固定 argv 白名单操作，没有任意 shell 执行入口；默认 dry-run。`--apply` 只说明调用方已有授权。写入后远程重读；PR 固定 base/head SHA、正文 hash、marker，创建超时先查询去重，更新发现人工正文漂移即停止。脚本无法提供 GitHub API 本身没有的跨请求原子 CAS，操作前后均检查漂移并在未知结果时保留恢复证据。

调用方迁移：C 的只读 PR 查询、T 四个原模式和 retro command 均改为直接读 T 的远程协议。C/retro 不激活 T、不创建 SpecDev change。retro command 保留自己的报告与提交账本，目标固定 NAMEWTA/Speculo；未安装 SpecDev 时仍可完成本地分析，远程分支报告缺少依赖。

## 记录 owner 与数据接口

| 数据 | 版本/位置 | owner 与迁移 |
|---|---|---|
| SpecDev config | v6 | CLI staging 内将 v5 升级，增加 github.include_external_prs=false 和 labels={}，保留用户其他选项 |
| 全局/change status | 原 v5/v6 | 不改变版本；增加 Work/工件识别，不批量重写运行数据 |
| triage | v2 | 增加 disposition、verification、remote_actions；旧活动 v1 由 T 在用户选择该分支后补证据，历史归档只读解释 |
| source | v1 | source.md 永不覆盖；sources/SRC-###.md 链接 supersedes_source，triage.source 选择当前版本 |
| PR record | v1，change/pull-requests/PR-###.md | T，记录 requested 和 delivery_target=draft/ready；明确请求的未闭合交付挡对应归档门 |
| TRI record | v1，state/specdev/triage-runs/TRI-###.md | T 的独立 CI/安全/预检/发布记录，不占用 current_work |
| Retro | v1，change/retro/RETRO-###.md | R；独立或已完成/归档来源另建非实现 review change |
| Logic prototype | v1，change/prototypes/LOGIC-NNN | P，logic.md + 单文件离线 index.html |

source/triage 的 external_action、Ticket publish 账本、workspace capture、PR、TRI 相互独立。recover 恢复原记录；不能另建成功记录掩盖失败。TRI 使用逐目标 targets 数组，release completed 要求 required 目标全部 verified 且有 receipt；npm required 项还必须有包名、registry、version、dist-tag。独立发布不自动成为 change 完成门。

## 其他行为变化

- R-retro 与共享 retrospective 分离持久化和分析。检查导航、自动检查、编码标准、全局指令、工具使用、无效指令、信息访问七类环境问题；保留根因、owner、验收与路由，允许无发现、证据不足、重复或仅教训。共享 Skill 不操作远程、不映射仓库标签。
- P 增加离线逻辑原型与显式项目预览。原 UI 默认 3、最多 4 个方案、design-system.md 权威源和最终物化约定保留。浏览器验证不足不得标 ready；静态 HTML 校验不是运行证明。
- D/I 补充脱敏和变异落地证据：实际执行文件中的变异、预期断言失败、恢复后通过三者缺一不可；编译失败或错误测试路径不是有效红灯。
- G/A 共用 domain-modeling、context-format、adr-format；I/R 共用 design-it-twice，均位于 common/rules。S/T 引用原型已验证行为；P 保留既有 Lead/frontier，C 保留两个审查轴，W 保留每会话最多一个调查 Ticket。
- release 删除“两次失败证明非 flaky”、默认巡检周期、自动合并和删除/重打远程 tag、force-push 的恢复建议。npm 已发布版本不重发，部分成功仅补缺失动作。
- 简短且每次必需的 entry-procedure 合并进入 Skill；source-code-zip 的大量 flags/示例保留在 cli-reference。未删除参数、产物数量、授权或失败门。
- writing-for-agents 统一编写和保真合同。显式调用 Skill 同时提供 Claude disable-model-invocation 和 Codex agents/openai.yaml；validator 检查两者，metadata 不充当宿主限制。
- CLAUDE 使用真实 `@AGENTS.md` 导入；CLI 只自动升级精确匹配的旧生成桥接，保留用户自定义正文。AGENTS 按真实作用域决定拆分，manifest 只是证据。

## 安装升级与失败恢复

1. 使用现有 CLI init/refresh 路径；配置变更在 staging 校验后原子替换，没有新增旁路迁移命令。
2. 旧三个 Skill 只有在 CLI managed manifest 证明 owner=core/skills 且文件 digest 未变时才可移除。用户修改、额外未拥有文件或特殊节点触发 retired-asset-conflict，旧安装与 runtime 保持原状。
3. 活动 Ticket 绑定旧 Skill 时由 Lead 显式重新绑定并复查 Ready；不静默改执行合同。旧归档、来源快照、未知二进制工件、command 报告按原字节保留。
4. config v5 中出现未声明 github 字段时停止该替换，先明确归属；低于 v5 不自动迁移。锁、drift、未闭合事务仍走现有 CLI 停止规则。
5. 事务失败先用 doctor/resolve 读取实际状态，再按原事务 ID 显式 recover；不要手工清理锁或覆盖 staging。备份及 `.speculo/back/` 只由 CLI 管理。
6. 远程动作失败回到原 PR/TRI/capture/publish/triage 记录，先重新查询远程对象，再决定重试或只补后续动作。发布结果 unknown 时不得以日志缺失推断尚未发布。

## 1.0.20 发布整合

用户确认“0.0.1”表示在最新版本上递增补丁号，因此本次目标为 `@namewta/speculo@1.0.20`、npm `latest` 和 GitHub `v1.0.20`。已快进拉取 `main` 到 `fddad355fadf263493e44bffec3469d185b1608f`，保留新加入的可选 Agent Skills 投影。两份 README 经归一化换行后完成三方合并，分别保留新投影说明和本次 15 Work / 9 Skill 升级说明；安装测试的纯换行差异在备份后恢复，不丢弃行为改动。

整合修复将投影测试的预期数量从 30 调整为 31，并使用重命名后的 `writing-for-agents`。投影运行时会动态读取 `scripts/validate-skills.mjs`，该文件现已加入 npm 分发清单，避免源码测试通过但安装包缺依赖。CHANGELOG 保留 Unreleased，并将最新提交的投影说明与本次升级、Windows OPS 修复共同归入 1.0.20。

实际打包得到 900 个文件。解压 tarball 后，在一次性项目执行 `init --workflows specdev --agent-skills specdev`，生成 15 个 Work 指针（含 R-retro），再运行 `doctor --json` 得到 healthy=true。该夹具只将现有锁文件安装的 node_modules 链入解压目录，未重新下载依赖，也未修改用户项目。

拉取整合后再次执行完整 `pnpm test`：291 项中 266 通过、25 跳过、0 失败，退出码 0，约 548 秒；OPS 子套件为 198 项中 194 通过、4 项 Linux 专用跳过、0 失败。`pnpm validate-assets`、`pnpm verify-bin` 与暂存区 `git diff --cached --check` 均退出 0。暂存检查另外发现并清理了 24 个新增文件的末尾空行，资产校验再次通过；下方 282 项记录保留为拉取前的验证证据。

发布顺序为本地验证、提交并推送 main、等待该准确 SHA 的 CI、推送指向同一 SHA 的版本 tag，再由现有 Release workflow 发布 npm/GitHub Release并读回。发布说明、每个目标状态、准确 SHA/run ID 和结果放在本轮原操作记录 `C:/Users/cdewta/AppData/Local/Temp/speculo-release-lkQRuk/session.json`，不将未结束的发布写为完成。该目录保留拉取前 966 个真实源文件、逐文件 hash 与完整 patch。

## 审查与验证

[导航审查](navigation-audit.json) 对 7 个引用环与 55 个未链接候选分别给出处置。保留条件导航、宿主发现入口、动态模板与其他 workflow 的证据；没有仅凭图中零入边删除文件。[全源字符统计](source-size.json) 包含入口及迁出的 references，单列生成物；不换算 Token、费用或套餐额度。

新增测试覆盖完整分页/对象类型/SHA 漂移、PR dry-run、创建超时去重、正文冲突、ready 幂等、Issue 幂等关闭、目标回执缺失、Retro 完成门、来源快照替代链、离线 HTML/digest、config v5 迁移、旧资产所有权保护与不透明 runtime 保留、CLAUDE 自定义内容保护、宿主显式调用字段正反例。CI/发布本身是按需执行协议，未用真实远程写入进行验收。

| 命令/检查 | 退出码 | 实际结果 |
|---|---:|---|
| pnpm build | 0 | TypeScript 构建通过 |
| pnpm test | 0 | 修复后完整复跑 282 项：259 通过、23 跳过、0 失败；OPS 子套件另计 198 项：194 通过、4 项 Linux 执行测试跳过、0 失败；完整运行约 585 秒 |
| OPS bootstrap/workspace 针对性复测 | 0 | 50 项：46 通过、4 项 Linux 执行测试跳过；另行执行秘密信息保护部署 1 项、atomicWrite 链接拒绝 1 项，均通过 |
| 收口相关测试（specdev-upgrade、local-first、T capture/publish、work-upgrade-contracts） | 0 | 82 项：81 通过、1 个 POSIX gh 替身测试在 Windows 跳过；跨平台 transport 替身覆盖对应幂等行为 |
| pnpm validate-skills | 0 | 16 个分发 Skill 的发射格式与显式调用策略有效 |
| pnpm validate-source-parity | 0 | 26 项历史清单目标有效；旧源 hash 明确未认证 |
| node scripts/check-specdev-upstream.mjs --online | 0 | 固定 revision 的 110 个文件 hash 一致，38 个入口处置齐全 |
| pnpm validate-assets | 0 | 引用、schema、自检、生成物与现有工作流约束通过，Markdown 文件断链 0 |
| pnpm verify-bin | 0 | CLI 入口通过 |
| canonical / AUTO-INDEX 第二次生成 | 0 | 逐文件 hash 相同，无二次生成漂移；只保留既有 5 个 canonical 产品 |
| npm pack --dry-run --json --ignore-scripts | 0 | 896 个文件，含第三方许可，不含退役 Skill 入口；未发布 |
| git diff --check | 0 | 无空白错误 |

首次收口的完整套件曾有 10 项 OPS 失败。用户随后要求修复并争取全绿，因此本次补充修改 OPS runtime、测试夹具和 Windows CI；旧失败结论由后续复跑结果替代。

OPS 修复与新增行为：

- Linux SSH 安装包目标路径与 Node 绝对路径按 POSIX 规则处理，不受 Windows 控制端的路径规则影响。scp 在启动子进程前拒绝 Windows 路径、反斜杠、NUL、空白与 `..`。
- 本地执行夹具声明实际控制端平台；Linux SSH 夹具使用独立的远端 POSIX 路径。Docker 就绪检查按 Linux 路径构造证据；权限字段使用本机完整路径匹配，继续要求 `0600`。
- Windows 使用无需管理员权限的目录 junction 验证根目录与输出链接拒绝；仍验证外部哨兵文件未被修改和 catalog 锁阻止执行。原先在 Windows 链接创建异常时直接返回成功的 atomicWrite 测试也改为实际检查拒绝及目标未写入，并已单独补测通过。Linux 保留文件符号链接输出场景。
- 4 项实际执行 Linux `/bin/sh` 和 Linux Node 的测试明确限于 Linux。Windows 上其余 bootstrap、授权、hash、登记、只读发现和真实本机部署测试继续执行；新增完整 SSH 安装/登记模拟与非法路径负例。原先仅判断退出码非零的 shell 负例改为检查正常启动、准确退出码和预期错误，避免把程序不存在当作安全校验通过。
- 新增两个跨平台回归测试先在旧实现得到预期失败：远端路径带反斜杠、非法路径进入 scp；修复后均通过。针对性检查为 50 项中 46 通过、4 项 Linux 执行测试跳过，另外秘密信息保护的真实部署夹具 1 项通过。
- Windows CI 新增上述 bootstrap/workspace 和秘密信息保护回归；现有 Ubuntu CI 继续执行完整测试，包括 4 项 Linux 执行测试。此次尚未触发远端 CI。外层 Windows 子套件等待上限保留 900 秒，以容纳真实进程与 registry 探测。

本轮修改前的真实源备份：`C:/Users/cdewta/AppData/Local/Temp/speculo-ops-fix-7d8fb9a890da4452b2454417ebe8d17c`。备份包含 5 个 OPS 源/测试文件、CI 与本报告及统计；已检查这些受 Git 跟踪源均为普通文件、mode `100644`。恢复时逐文件比较，不覆盖此前 SpecDev 升级或用户后续修改；未改变用户 runtime、安装状态或真实远端。全源统计追加 OPS 与 CI 目录，见 `source-size.json`。

验证日志保存在本机临时目录：`C:/Users/cdewta/AppData/Local/Temp/speculo-ops-fix-full-test.log`、`speculo-ops-targeted.log` 和 `speculo-ops-fix-assets.log`。完整测试运行期间补强的 atomicWrite 链接拒绝断言已另行补跑通过；未为这一项测试夹具调整重复整套长时运行。

当前 Windows 本地检查全部退出码为 0；跳过不计作通过。主套件的 23 项跳过涉及既有平台、POSIX 进程/权限或符号链接权限限制；OPS 子套件的 4 项跳过明确要求 Linux 执行环境，两层统计分别报告。未验证：真实 Codex/Claude 的调用与导入行为、真实 GitHub/npm 写入及 OIDC/Token 认证、Linux POSIX 集成及远端 CI、用户项目多包 workflow 的真实发布恢复、具体逻辑/UI 原型的浏览器场景。当前脚本测试使用替身/临时夹具，本地通过不认证这些实际环境。

规范依据：[OpenAI Skills](https://learn.chatgpt.com/docs/build-skills)、[AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)、[Claude Skills](https://code.claude.com/docs/en/skills)、[Claude Memory](https://code.claude.com/docs/en/memory)、[npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)、[npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/)、[GitHub workflow rerun](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs)。
