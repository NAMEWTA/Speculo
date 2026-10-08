# Ops 2.3 首次接入与持久化根：实施验收

日期：2026-10-08。源码基线：`3593c98968217ee1a67b8bac23b69d1077d16bf0`。本次在 Windows、Node.js v24.21.0、pnpm 11.1.3 上实施；未连接真实服务器。

## 实际行为变化

- 保留 I/S/H/D/V 与 status schema v3。使用顺序为控制端初始化、Host 接入及最小初始化、Project 明确部署到 Host；Deployment 继续固定项目、主机、环境与实例。
- 新增 server-discover：Linux 通过不提权的 POSIX 只读探测得到机器身份、真实登录账号和账号数据库主目录，不要求预装 Node。建议根为真实主目录下 ops；Windows/macOS 保留已有 Node 适配。
- 新增 server-root-confirm：记录用户实际确认语句、目标、探测摘要和独立不可覆盖回执；建议本身不能用于登记或引导。缺确认、取消、权限不足、危险路径、链接、受管文件冲突、身份或证据漂移均阻塞对应动作。
- 新 Host 必须引用真实确认回执。原 Host.root 保持唯一事实源；同机重复登记被拒绝，换账号由 S 生成精确连接更新计划，保留原 Host/root/确认回执。
- 新增 server-initialize-spec，只按事实补缺失受管目录并交付双边文档。Docker、语言环境和入口服务仍按项目需求准备；不自动迁移既有 Docker 数据。
- 新确认 Host 的目录锁/解锁与 bootstrap 使用登录账号，避免 sudo 首次创建根后令原账号无法回读 owner；具体受批准步骤仍可提权。旧 Host 不改变原执行身份。
- Node 引导保留固定构件、SHA256 和独立授权；增加按机器/根记录的 started/installed 证据。恢复须核验旧进程停止、保持原输入摘要并记录实际恢复授权，不因换确认回执而自动重放。
- V 增加账号、根确认摘要与分开的登记、目录、文档、运行环境状态；仅使用控制端证据，旧文档收据不能掩盖新的 docs_pending。

主要入口见 [README](../template/workflows/ops/README.md)、[首次接入规则](../template/workflows/ops/common/rules/host-root-and-onboarding.md)、[操作手册](../template/workflows/ops/common/WORKSPACE-USAGE.md)。[调研记录](../template/workflows/ops/common/rules/research-and-decisions.md) 记录 Ansible inventory、Kamal、pyinfra 及既有固定提交 SSH Skill 的采用和舍弃项；没有复制第三方实现，也没有增加这些工具的运行依赖。

## 验证记录

| 命令 / 检查 | 退出码与实际结果 |
| --- | --- |
| `node --test --test-reporter=tap template/workflows/ops/common/tests/test_ops.mjs template/workflows/ops/common/tests/test_ops_bootstrap.mjs template/workflows/ops/common/tests/test_ops_workspace.mjs` | 0；198 项，194 pass、0 fail、4 skip |
| `node --test --test-reporter=tap template/workflows/ops/common/tests/test_ops_onboarding.mjs template/workflows/ops/common/tests/test_ops_bootstrap.mjs` | 0；32 项，27 pass、0 fail、5 skip |
| 最终接入改动后：`node --test --test-reporter=tap template/workflows/ops/common/tests/test_ops_onboarding.mjs` | 0；14 项，13 pass、0 fail、1 skip |
| `pnpm build` | 0 |
| `node --test dist/test/ops-workflow.test.js` | 0；外层 23/23 pass；内部集成 212 项，207 pass、0 fail、5 skip。套件启动后的最后接入边界改动由上方最终 14 项定向测试补验 |
| `node template/workflows/ops/common/tools/validate-ops.mjs --self-check` | 0；Ops 2.3.0、5 Works、status schema v3 |
| `pnpm validate-assets` | 0；Skill/源清单/分发物/刷新合同/框架引用/工作流静态校验通过 |
| `node scripts/validate-workflow-disclosure.mjs --json --changed template/workflows/ops/S-server-connect/S-server-connect.md` | 0；无错误，反向调用覆盖 I/H/D/V/INDEX/README |
| `node skills/speculo-write-workflows/scripts/generate-index.mjs template/workflows/ops` 连续两次 | 均为 0；两次字节不变，README SHA256 为 bfd8844911ee8ca783363c259cd6b17909fe5e5a92b1f95555a3135aaf774c2b |
| 改动的 18 个 mjs 文件 `node --check`；`git diff --check` | 均为 0 |

接入测试覆盖 root/普通账号/自定义主目录、sudo 前探测、Windows 账号大小写、建议不构成确认、自定义或提前明确根、重复接入、空确认、危险路径、链接、非空无 owner、权限、身份/主目录/信任/回执漂移、同机换账号保留根、旧多根歧义、Node 缺失与恢复防重放、最小初始化实际执行及目录复用、双边文档和过期收据。多项目/多 Host、原执行器失败恢复及 Docker 持久化策略继续由已有集成套件覆盖。

测试日志位于控制端临时目录：speculo-ops-integration.log、speculo-ops-onboarding.log、speculo-ops-onboarding-final.log、speculo-ops-built.log、speculo-ops-assets.log。没有执行完整仓库 pnpm test 或真实服务器验收。静态资产门报告的历史 source hashes 未验证、remote upstream hashes 未重新在线验证，以及 7 个引用环/55 个候选孤立引用，仍按原工具说明保留，不能把退出码 0 扩写为这些来源已实证校验。

## 备份与恢复

实施前备份：`C:/Users/cdewta/AppData/Local/Temp/speculo-ops-before-1791448888157`。manifest.json 记录原 revision、文件模式、链接与完整字符数；备份含整个 Ops workflow、src/ops-resources.ts、test/ops-workflow.test.ts 与旧验证记录。真实源均为普通文件，未替换软链接，未修改系统/插件缓存。

源码回退时先保留当前 diff，再按 manifest 逐文件从备份恢复已修改的真实源，仅移除本次新增且仍未被其他工作使用的文件，重建 AUTO-INDEX 并复跑验证；不要覆盖其他用户工作。此次没有对目标服务器执行操作，因此没有远端数据回滚。

运行态升级保留旧根、历史 Run/Release、凭据及 records 的原始字节；Windows 有私人运行数据时现有刷新器仍因不具备 ACL-preserving 刷新能力停止，本次测试验证停止前后原数据未变，不把拒绝刷新表述为刷新成功。新执行器/Schema 改变 engine_digest，旧未执行计划应重新生成。已有 unknown、锁、未闭合事务先 inspect-run；docs_pending 用 docs-sync 补交文档，不重放业务。

## 未验证范围与限制

未在真实 Linux/macOS/Windows SSH 主机执行接入、sudo、systemd、Docker、项目部署或数据迁移。Linux 原生 shell/tar 的 5 个测试在 Windows 跳过；模拟 SSH 测试只验证协议与授权门，不等于真实 SSH 通过。Windows 本地临时目标实际执行最小初始化、双边文档与路径链接防护；不等于 Windows SSH 或 Docker 验收。

无 Node 且所选根含空白时，现有 scp 适配在远端写入前拒绝；可先提供已有 Node，不能静默改根。非空无 owner 的新根不自动接管；旧同机多根在自动识别/重接入时阻塞歧义，需单独恢复方案。真实服务器验收须另行给出明确 Host 与授权范围。

## 完整源码字符统计

本次共 52 个新增或修改文件，完整源码字符数 **504097 → 573183**（增加 69086）；包含本验收记录与全部抽出引用。逐文件统计保存在控制端临时文件 `speculo-ops-source-counts.json`。统计口径为改动文件完整 UTF-8 文本的 JavaScript string.length，包含抽出引用、Schema、测试及生成索引；新增文件原始长度记 0。它不是 Token、计费或套餐节省估算。

## v1.0.21 发布前补验

2026-10-08，版本从 1.0.20 提升至 1.0.21。`pnpm check` 退出码 0：完整仓库测试 292 项，267 pass、0 fail、25 skip，随后资产验证通过；OPS 内部集成套件随完整测试执行。`pnpm verify-bin`、独立 `pnpm validate-assets`、S-server-connect 反向引用审计及 `git diff --check` 均退出码 0。OPS AUTO-INDEX 连续两次生成与原字节一致。上述结果补充先前实施阶段未运行完整仓库测试的范围；真实服务器和 Linux 专属用例的本地限制仍有效。

发布准备前的 package.json 与 CHANGELOG.md 备份位于 `C:/Users/cdewta/AppData/Local/Temp/speculo-v1.0.21-release-backup`，完整检查日志位于同一临时目录的 `speculo-v1.0.21-check.log`。发布由 v1.0.21 标签触发既有 GitHub Actions，远端结果单独核验。

首次 release CI（37759342864）在 Linux 本地初始化夹具上失败：临时凭据文件默认权限过宽，已有 ledgerLoad 权限门正确拒绝；npm 与 GitHub Release 均未执行。夹具改为以 0600 创建文件，运行时权限门未修改。修复后定向接入测试退出码 0（14 项，13 pass、1 Linux skip），资产验证退出码 0；通过受旧标签对象约束的 force-with-lease 更新尚未发布的 v1.0.21 标签，再由 Linux CI 完整验证。失败日志保存在临时目录 speculo-v1.0.21-ci-failed.log。
