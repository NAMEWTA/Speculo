# CLI 安装与命令参考

[手册首页](README.md) · [快速入门](getting-started.md) · [安装恢复](transaction-recovery.md)

CLI 的真实入口是 [src/cli.ts](../src/cli.ts)。本页讲终端命令；AI 使用的功能入口见 [Command 工具箱](commands/README.md)。

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
speculo init [target] [--workflows <id,id> | --core-only] \
  [--skill-targets <targets>] [--skills <selection>]
```

`[target]` 默认是当前目录。方括号表示可选参数，不要把方括号输入终端。

| 参数 | 用途 | 例子 |
|---|---|---|
| `--workflows` | 本次安装或刷新的领域 | `specdev,learning` 或 `all` |
| `--core-only` | 只安装/刷新核心 Command 与共享方法 | 与 `--workflows` 互斥 |
| `--skill-targets` | 曝光位置，多选位置共用一份能力清单 | `agents`、`claude`、`agents,claude`、`none` |
| `--skills` | 统一的入口选择 | `none`、`keep`、`all`、`specdev/implement,command/status` |

可选领域为 `specdev`、`learning`、`ops`、`person`、`media`。领域选择决定安装哪些方法；曝光选择决定把哪些入口呈现给宿主。这两个维度独立，曝光不会补装缺少的 workflow。

| 曝光值 | 含义 |
|---|---|
| `none` | 不曝光；关闭既有投影时只清理验证通过的受管文件 |
| `keep` | 保留已有的统一入口清单，并刷新入口内容；不自动纳入升级新增的能力 |
| `all` | 曝光全部已安装的公开入口，包括领域、Work 和 Command 包装 |
| 业务 ID 列表 | 仅选择指定公开入口；完整 ID 看[能力目录](capabilities.md) |

例如只把实现和状态入口交给宿主：

```bash
speculo init . --workflows specdev --skills specdev/implement,command/status
```

交互式运行会按实际终端条件提示选择。**非交互首次安装**在没有领域参数时仅安装核心；**非交互刷新**默认刷新已安装且当前版本支持的领域。非交互新安装默认位置为 `agents`、能力为 `none`；刷新默认保留已有位置和统一能力清单。想得到确定结果时显式提供参数。

同时曝光到两个位置，或关闭所有位置：

```bash
speculo init . --workflows specdev --skill-targets agents,claude --skills all
speculo init . --skill-targets none
```

`--skill-targets none` 会清空位置和能力；不能与显式非 `none` 的 `--skills` 同用。交互终端只询问未由参数指定的配置。

当前使用 `projections.json` schema 3，保存曝光位置与一份能力 ID 清单。旧的两份清单格式不自动迁移；旧参数 `--agent-skills`、`--claude-skills` 和 `domains` 值已删除。旧格式会明确报错并保留文件，不应仅改版本号绕过校验。

刷新时本次未选的已安装领域仍保留；`--core-only` 不等于卸载所有领域。发生第三方同名目录、人工编辑或路径冲突时，阅读具体 warning；不要以删整个 `.agents/skills/` 的方式解决。

## 交互向导怎么选

在真实交互终端直接运行 `speculo init .`，可以先选择本次安装/刷新的 workflow，再多选曝光位置，最后统一选择一次能力。`.agents/skills/` 和 `.claude/skills/` 共用同一份清单。多选用空格勾选、Enter 继续。

| 向导选项 | 适合什么需求 |
|---|---|
| 全部曝光 | 所有已安装领域总入口、Work 和 Command 都可发现 |
| 按组曝光 | 选择完整领域组，或整个 Commands 组 |
| 自定义曝光 | 逐项选择入口，可跨组混选 |
| 保留已有选择 | 保留具体清单，升级新增入口不会自动加入 |
| 全部不曝光 | 方法正文保留，只处理受管曝光入口 |

首次默认勾选 `.agents/skills/`，能力范围默认“全部不曝光”；刷新恢复已有位置，能力范围默认“保留已有选择”。空选位置会跳过能力选择，清空统一清单，并清理两个位置中校验通过的受管入口。某组只选了部分入口时，自定义选择可以保留这个精确集合；“按组”勾选则选择整组。最后核对安装与曝光预览再确认应用，Ctrl+C/Esc 可取消。

“曝光”指本地宿主发现入口，不表示上传或公开到网络。所有选中位置共用一份能力清单。取消勾选某个位置，会清理该位置中未被人工修改的受管入口；第三方文件和冲突文件保留并报告。所有方式都定义本次最终清单，例如从全部曝光改为仅 Commands，会移除其他校验通过的受管入口，最终摘要只列一次能力清单的新增、保留和移除，再分别报告各位置预计新增、更新、移除、可用与冲突数量。

按组选择会包含 workflow 总入口和全部 Work；自定义时总入口单独勾选，选择某个 Work 不自动附带总入口。自定义分组页支持反复进入不同组编辑，返回曝光方式时保留本次草稿。仅核心安装时只能选择 Commands，不会为曝光而补装 workflow。

当前五个领域全部安装时，每个宿主有 53 个入口：5 个总入口、38 个 Work、10 个 Command。仅 SpecDev 整组为 16 个入口；自定义 `specdev/implement,specdev/code-review,command/status` 为 3 个入口。菜单按实际安装内容计算数量，包含本次没有选择刷新的已安装领域。

`groups` 和 `custom` 是交互向导选项，不是 `--skills` 的参数值；非交互选择具体入口用业务 ID 列表。只要总入口时可使用 `--skills domain/specdev,domain/learning`。

## 刷新与升级

先更新全局包，再到使用项目中刷新：

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
