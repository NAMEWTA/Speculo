# CLI 参考

终端 CLI 负责方法安装、文件保护、版本、诊断、定位与恢复。Work 和 Command 由 AI 读取执行；不存在 `speculo implement` 或 `speculo project-maintenance` 这样的终端子命令。

## 命令

| 命令 | 用途 |
| --- | --- |
| `speculo init [target]` | 首次安装或刷新选择的方法；省略 target 时使用当前目录 |
| `speculo version` | 显示本地版本并查询可用版本 |
| `speculo doctor [target] [--json]` | 只读检查安装健康；健康返回 0，存在检查问题返回 2 |
| `speculo resolve [target] --path <引用>` | 解析工作区路径，不创建文件 |
| `speculo recover [target] --transaction <ID>` | 对匹配的安装事务进行可验证恢复 |

```bash
speculo init . --workflows specdev --skill-targets agents --skills domain/specdev
speculo init . --workflows all --skill-targets agents,claude --skills all
speculo init . --hub-skills writing/eli5
speculo doctor . --json
speculo resolve . --path '{roots.references}/memory.md'
speculo version
```

## 安装参数

| 参数 | 含义 |
| --- | --- |
| `--workflows specdev,learning` | 安装领域及全部所属 Work/资料；支持 `all` 和 `none` |
| `--skill-targets agents,claude` | 选择宿主目录；`none` 不暴露宿主入口 |
| `--skills domain/specdev,specdev/implement,command/status` | 选择宿主可见入口；支持 `all`、`none`、`keep` |
| `--hub-skills writing/eli5` | 安装独立完整包；支持 `all`、`none`、`keep` |
| `--core-only` | 取消领域和 Hub，保留核心命令与用户资料 |

`--core-only` 不与 `--workflows` 同用；Hub 安装需要至少一个目标宿主。交互模式会预览最终选择，非交互模式按明确参数执行。省略选择时保留仍有效的已有选择；首次非交互安装没有预选的领域或方法投影。

## 公开 ID

领域使用 `domain/<领域>`，Work 使用 `<领域>/<任务>`，命令使用 `command/<名称>`。例如：

```bash
speculo init . --workflows specdev --skill-targets agents,claude --skills domain/specdev,specdev/prototype,specdev/implement,specdev/project-deploy
```

全部 39 个 Work 见 [能力总览](capabilities.md)。安装器从标准 `SKILL.md` 和实际目录发现入口，不需要工作流 manifest。原 Work 的短 ID 保持，例如 `specdev/spec`、`specdev/goal-plan`、`learning/lesson`；Ops 的五项迁入 SpecDev。

安装与暴露独立：只暴露 `domain/specdev` 时，其 Work 和资源仍完整安装，领域入口会按需指向它们。`--skills all` 是显式的全部曝光选择，不是使用工作流的前提。

## 刷新、升级与移除

升级 CLI 包后，在项目中再次运行 `speculo init .` 刷新受管方法。方法内容以安装包为准，用户记录和附加文件保留。默认/keep 会保留现存 Work 选择，并将旧 Ops 选择映射到新 SpecDev 入口；显式传入旧 Ops ID 时返回具体替代建议。见 [升级说明](upgrade-v3.md)。

取消领域或 Hub 时只移除可安全确认归属的受管文件。第三方同名对象、链接、只读节点和所有权冲突保留并报告。不要通过删除整个技能根目录来解决单项冲突。

交互启动可检查 CLI 新版本；自更新仅在可核实的 npm global 或 Volta 安装上使用相应更新路径，再继续原命令。非交互自动化不会为更新弹出选择。

## 诊断与恢复

`doctor` 检查安装身份、受管文件、领域/Work 入口、宿主投影和恢复状态。它不解释业务 JSON，也不认证 UI、学习掌握程度或部署完成。

中断时先保存 `doctor --json` 的具体问题与事务 ID，核对原进程和现场，然后调用对应 `recover`。恢复会比较文件和外部投影；无法确认一致时保留现场并报告冲突。完整步骤见 [事务恢复](transaction-recovery.md)。

`resolve` 可从项目子目录执行，使用实际 workspace 根。路径穿越、错误安装根和无效引用会报错；它不会通过猜测创建资料。
