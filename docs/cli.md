# CLI 安装与命令参考

[手册首页](README.md) · [快速入门](getting-started.md) · [安装恢复](transaction-recovery.md)

CLI 启动入口是 [src/cli.ts](../src/cli.ts)，命令分派见 [src/cli-app.ts](../src/cli-app.ts)。本页讲终端命令；AI 使用的功能入口见 [Command 工具箱](commands/README.md)。

## 环境与安装

Node.js 范围为 `>=22.22.3 <25`，包名是 `@namewta/speculo`：

```bash
npm install -g @namewta/speculo
speculo --help
speculo version
```

`version` 显示当前安装版本并检查更新。仓库版本以 [package.json](../package.json) 为准，发布变化看 [CHANGELOG](../CHANGELOG.md)。

## 安装与曝光

```bash
speculo init [target] [--workflows <all|none|id,id> | --core-only] \
  [--hub-skills <selection>] [--skill-targets <targets>] [--skills <selection>]
```

`[target]` 默认是当前目录。方括号表示可选参数，不要把方括号输入终端。

| 参数 | 用途 | 例子 |
|---|---|---|
| `--workflows` | 最终安装的领域清单；取消选择会卸载 | `specdev,learning`、`all` 或 `none` |
| `--hub-skills` | 完整 Skills Hub 包的最终清单 | `none`、`keep`、`all` 或 `automation/herdr,automation/orca` |
| `--core-only` | 清空 workflows 和 Skills Hub，保留核心与运行数据 | 与 `--workflows`、非 `none` 的 `--hub-skills` 互斥 |
| `--skill-targets` | 曝光位置，多选位置共用一份能力清单 | `agents`、`claude`、`agents,claude`、`none` |
| `--skills` | 统一的入口选择 | `none`、`keep`、`all`、`specdev/implement,command/status` |

可选领域为 `specdev`、`learning`、`ops`、`person`、`media`。领域选择决定安装哪些方法；曝光选择决定把哪些入口呈现给宿主。这两个维度独立，曝光不会补装缺少的 workflow。

| 曝光值 | 含义 |
|---|---|
| `none` | 不曝光；关闭既有投影时清理受管文件，包括本地修改 |
| `keep` | 保留已有的统一入口清单，并刷新入口内容；不自动纳入升级新增的能力 |
| `all` | 曝光全部已安装的公开入口，包括领域、Work 和 Command 包装 |
| 业务 ID 列表 | 仅选择指定公开入口；完整 ID 看[能力目录](capabilities.md) |

例如只把实现和状态入口交给宿主：

```bash
speculo init . --workflows specdev --skills specdev/implement,command/status
```

交互式运行会按实际终端条件提示选择。**非交互首次安装**在没有领域参数时仅安装核心；**非交互刷新**默认保留并刷新已安装领域与 Hub 包；历史包当前不可用时明确报错，须显式重选。非交互新安装默认位置为 `agents`、能力为 `none`；刷新默认保留已有位置和统一能力清单。想得到确定结果时显式提供参数。

同时曝光到两个位置，或关闭所有位置：

```bash
speculo init . --workflows specdev --skill-targets agents,claude --skills all
speculo init . --skill-targets none
```

`--skill-targets none` 会清空位置和曝光能力；所选 Hub 包非空时拒绝继续，需同时明确 `--hub-skills none`。不能与显式非 `none` 的 `--skills` 同用。交互终端只询问未由参数指定的配置。

当前使用 `projections.json` schema 3，保存曝光位置与一份能力 ID 清单。旧的两份清单格式不自动迁移；旧参数 `--agent-skills`、`--claude-skills` 和 `domains` 值已删除。旧格式会明确报错并保留文件，不应仅改版本号绕过校验。

显式清单及交互勾选决定最终安装内容。受管能力以本次运行的安装包为准，覆盖本地内容与普通权限修改，补齐缺失文件。取消勾选会卸载受管 workflow 方法和领域/Work 入口，同时更新发现导航；其配置、change、知识、历史与基线数据保留。用户附加文件原位保留，不登记为受管文件。链接、只读保护、节点类型或归属冲突使受影响包保留，摘要区分请求与实际结果。发生第三方同名目录或路径冲突时，阅读具体 warning；不要以删整个 `.agents/skills/` 的方式解决。

## 交互向导怎么选

在真实交互终端直接运行 `speculo init .`，首屏并列显示全部 Hub 分类和 Workflow。使用 ↑↓ 移动，Enter 进入分类或切换 Workflow：

```text
Hub · automation · 自动化 (0/3)
Hub · coding · 编程 (0/3)
Hub · design · 设计 (0/1)
Hub · system · 系统 (0/6)
Hub · writing · 写作 (0/2)
Learning · 学习
Media · 内容创作
Ops · 运维
Person · 认知与决策
✓ SpecDev · 工程开发
完成选择 →
```

分类括号显示已选数/总数，Workflow 的 ✓ 表示已选。只有进入某个分类后才列出其中的 Skill，用空格勾选、Enter 保存并返回；空选清空当前分类，其他分类的选择保留。首次均未选中，刷新预选实际受管包。列表按终端高度尽量完整显示，放不下时滚动，长文本适配终端宽度。

选择“完成选择”后，多选 Skill 安装位置，再选择 workflow/Command 的曝光入口。Hub 包不会在曝光页重复询问。`.agents/skills/` 和 `.claude/skills/` 共用同一份清单。

界面使用青色重点、绿色选中/成功、黄色提醒和红色错误。设置 `NO_COLOR=1` 可关闭颜色；标准输入或输出被重定向时不启动交互向导，输出重定向时使用无色文本且不播放动画。`doctor --json`、`recover` 的 JSON 和 `resolve` 的路径输出保持纯文本格式。

| 向导选项 | 适合什么需求 |
|---|---|
| 全部曝光 | 所有已安装领域总入口、Work 和 Command 都可发现 |
| 按组曝光 | 选择完整领域组，或整个 Commands 组 |
| 自定义曝光 | 逐项选择入口，可跨组混选 |
| 保留已有选择 | 保留具体清单，升级新增入口不会自动加入 |
| 全部不曝光 | 方法正文保留，只处理受管曝光入口 |

首次默认勾选 `.agents/skills/`，能力范围默认“全部不曝光”；刷新恢复已有位置，能力范围默认“保留已有选择”。未选 Hub 包时，空选位置会跳过能力选择，清空统一清单，并清理两个位置中校验通过的受管入口。某组只选了部分入口时，自定义选择可以保留这个精确集合；“按组”勾选则选择整组。最后核对安装与曝光预览再确认应用，Ctrl+C/Esc 可取消。

“曝光”指本地宿主发现入口，不表示上传或公开到网络。所有选中位置共用一份能力清单。取消勾选某个位置，会清理该位置中的受管入口，包括本地修改；第三方文件和冲突文件保留并报告。所有方式都定义本次最终清单，例如从全部曝光改为仅 Commands，会移除其他校验通过的受管入口，最终摘要只列一次能力清单的新增、保留和移除，再分别报告各位置预计新增、更新、移除、可用与冲突数量。

按组选择会包含 workflow 总入口和全部 Work；自定义时总入口单独勾选，选择某个 Work 不自动附带总入口。自定义分组页支持反复进入不同组编辑，返回曝光方式时保留本次草稿。仅核心安装时只能选择 Commands，不会为曝光而补装 workflow。

当前五个领域全部安装时，每个宿主有 53 个入口：5 个总入口、39 个 Work、9 个 Command。仅 SpecDev 整组为 17 个入口；自定义 `specdev/implement,specdev/code-review,command/status` 为 3 个入口。菜单按实际安装内容计算数量，包含本次没有选择刷新的已安装领域。

`groups` 和 `custom` 是交互向导选项，不是 `--skills` 的参数值；非交互选择具体入口用业务 ID 列表。只要总入口时可使用 `--skills domain/specdev,domain/learning`。

## Skills Hub 完整包

仓库真实源为根目录 `skills-hub/<类别>/<技能>/SKILL.md`，与 `template/` 同级。安装器只发现两层入口，包内嵌套的示例 Skill 不单独列出；所选包的 references、scripts、templates、agents、许可、空目录与模式一并复制，保持原始名字。安装不执行包内脚本。npm 分发包含库源；构建时在 dist 中生成完整资源快照，保全 npm 会省略的 dotfile、空目录与模式，安装时核对包内现存源文件字节。用户项目只保存所选包，不在 `.agents/speculo/` 中镜像全库。

```bash
speculo init . --hub-skills automation/herdr,automation/orca --skill-targets agents,claude
speculo init . --hub-skills none --workflows none
```

两类 Skill 共用安装位置。CLI 用 `.agents/speculo/.speculo/hub-skills.json` 记录 Hub 选择与每个包的文件、目录、摘要和模式归属；workflow/Command 入口继续使用 `projections.json`。同名非受管目录不自动接管；受管文件的内容或普通权限修改不阻止更新或卸载，用户额外文件保留且不纳入归属清单。新包文件与非受管文件重名、symlink、hardlink、只读保护或节点类型冲突时整包保留并报告，其余包继续。卸载后若留下用户文件，再次安装仍按非受管同名目录处理，不自动接管。

公共编排初始化可选择当前宿主 / CLI / Herdr / Orca；默认建议当前宿主，外部方式可保存允许回到 host 的偏好。CLI 可选保存工具与无头或交互方式，实际调用仍按工具指南。Herdr/Orca 只复用指定位置已有的 Skill；缺失时提示通过安装器勾选对应 Hub 包，不下载 GitHub main，不检查或启动服务。

## 刷新与升级

交互启动 `speculo`、`speculo init` 或普通文本 `doctor` 时，会先查询 CLI 自身的 npm 最新稳定版本。每次联网最多等待 2 秒，断网或查询失败直接继续。发现新版本后，先分行显示「当前版本号」和「最新版本号」，再用方向键选择、Enter 确认：

- **立即更新**：核验当前安装方式，显示并执行对应更新命令，验证后用新版继续原命令，保留参数、目录及环境。
- **下次更新**：立即继续原本交互，下次启动仍有新版时再次提醒。

自动更新支持核验通过的当前 npm 全局安装和 Volta 安装。npm 安装执行 `npm install -g @namewta/speculo@<最新版本> --prefix <已核验位置>`；Volta 安装通过 `volta run --node <当前 Node.js 版本> --bundled-npm npm install --global @namewta/speculo@<最新版本>` 更新，保留当前 Node.js 运行版本。源码、链接、npx、pnpm 等无法核验的来源同样先显示两个选项；选择立即更新后会提示按原安装方式处理并结束本次调用。新版 Node.js 要求不满足、更新失败或取消时不执行原命令，按提示修复后重试。不会自动使用 sudo 或更新 Node.js。更新发生在安装事务创建之前，CLI 包更新本身不刷新项目；原命令为 `init` 时才进入项目安装流程。

「下次更新」只影响本次启动，不写入忽略记录；旧版 `~/.speculo/update-state.json` 中的忽略记录不再屏蔽提醒。设置 `SPECULO_NO_UPDATE_CHECK=1` 可关闭自动检查。非 TTY、CI、帮助、`doctor --json`、`resolve` 和 `recover` 不触发自动检查，也不增加提示或动画。`speculo version` 保留显式查询功能，不弹更新菜单。

也可以手动升级，再到使用项目中刷新：

```bash
npm install -g @namewta/speculo
speculo init .
speculo doctor .
```

再次 `init` 即刷新。CLI 采用 staging、验证和切换机制，保留运行时数据及用户拥有的文件。旧安装布局、未知 schema 或业务协议不能通过改版本字段强行升级；按[恢复与兼容说明](transaction-recovery.md)处理。

当前没有 `speculo update`、`speculo migrate` 或 `speculo mirror-skills`；旧参数 `--all`、`--apply`、`--dry-run` 也不是当前 CLI 的通用选项。需要全部领域用 `--workflows all`。某个业务工具自己的 `--dry-run` 与这里的 CLI 选项无关。

## doctor：只读检查

```bash
speculo doctor .
speculo doctor . --json
```

检查安装完整性及恢复证据。输出会声明检查范围和未检查项；它不运行你的应用测试，不修复 workflow 数据，也不认证宿主已经正确调用 Skill。

## resolve：把路径引用转换成本地路径

```bash
speculo resolve . --path '<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>'
```

`--path` 必须提供。这个命令只解析一个受约束路径，不启动 Work、不执行 shell、不创建目录。解析依赖有效安装的 workspace；默认安装常用 roots 为：

| alias | 指向 |
|---|---|
| `roots.workflows` | 已安装的 workflow 方法 |
| `roots.commands` | 已安装的 Command 定义 |
| `roots.references` | 共享方法 |
| `roots.state` | 运行时状态与业务数据 |
| `roots.skills` | 项目 `.agents/skills/` |

不要把命令报告写进 `roots.commands`；报告通常属于 `roots.state/commands/<id>/`。

## recover：恢复明确的安装事务

先运行 doctor，取得真实事务 ID。确认原安装进程已经停止、仍在原主机和平台，再运行：

```bash
speculo recover . --transaction <doctor报告的完整事务ID>
speculo doctor .
```

这里的尖括号内容需要替换。`recover` 只处理匹配的安装事务，不能用来恢复业务 Goal、OPS 部署或任意 Git 状态。恢复会重验所有相关证据，漂移或未知版本时保留现场并停止，详见[恢复指南](transaction-recovery.md)。

## 返回码

| 结果 | CLI 返回码 |
|---|---|
| 正常完成；doctor 健康 | `0` |
| 参数/常规执行错误 | `1` |
| doctor 不健康；安装刷新被合同阻塞 | `2` |
| 提示期间 Ctrl+C/Esc 取消 | `130`；在最终确认中选择取消返回 `0`，均不应用安装变更 |

排障时保留完整命令、返回码及具体 blocker。不要把只有“退出 0”的记录当作业务验收证明。
