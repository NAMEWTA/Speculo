# CLI

CLI 管文件安装；四个工作流与八个命令由 AI 读取执行。

## 常用命令

```bash
speculo init .
speculo init . --workflows specdev --skill-targets agents --skills domain/specdev
speculo init . --workflows all --skill-targets agents,claude --skills all
speculo init . --hub-skills writing/eli5
speculo doctor . --json
speculo resolve . --path '{roots.references}/memory.md'
speculo version
```

| 参数 | 含义 |
| --- | --- |
| `--workflows specdev,learning` | 选择领域；支持 `all` 和 `none` |
| `--skill-targets agents,claude` | 设置宿主技能目录；`none` 不暴露宿主入口 |
| `--skills domain/specdev,command/status` | 选择公开方法；也支持 `all`、`none`、`keep` |
| `--hub-skills writing/eli5` | 按分类/名称安装完整 Hub 包；也支持 `all`、`none`、`keep` |
| `--core-only` | 不选择工作流和 Hub；保留基础命令与用户数据 |

交互模式提供选择和安装预览；非交互模式按参数执行，省略选择时保留可用的已有选择。新安装需要明确选择或使用交互界面。`--core-only` 不与 `--workflows` 同用。

方法选择与宿主暴露分开：安装了某领域后，只有选择相应 `--skills` 和目标宿主，宿主目录才出现入口。Hub 包使用相同宿主目标。完整实例见 [快速开始](getting-started.md)。

## 更新与移除

再次运行 `speculo init .` 使用当前 CLI 包刷新已选能力。方法内容由包管理，受管内容的本地编辑会被新版替换；用户自己的笔记和附加文件不会被当作模板清空。

取消某个领域或 Hub 会删除其可安全确认归属的受管文件。碰到第三方同名文件、危险节点或文件归属冲突时保留并报告，避免接管其他技能。

交互启动可检查 CLI 新版本。只在确认的 npm global 或 Volta 安装上执行相应更新，再继续原命令；普通自动化命令不会为了更新弹出提示。

## 诊断与恢复

`doctor` 只读检查安装身份、文件、公开入口与投影。它不读取业务 schema，也不把发版记录或验收描述解释成通过。

若安装被中断，先运行 `speculo doctor .`，根据输出核对目标项目和待恢复事务，再使用实际返回的 ID：

```bash
speculo recover . --transaction <实际事务ID>
```

恢复前后会比较文件快照。若用户在中断期间修改了同一位置，恢复会报告冲突；不要手工删除锁或日志来绕过。保留现场后处理具体冲突，再尝试对应恢复。普通业务文件格式不合法不需要调用安装恢复。

路径解析可从项目子目录执行，使用 workspace 的实际项目根。`resolve` 不创建文件，也不允许路径穿越或指向错误安装根。

## v3 的入口变化

`ops` 合并入 `specdev`；`specdev/spec`、`specdev/goal-plan`、`ops/project-deploy` 等 Work ID 已移除。请调用领域技能并描述要做的工作。旧数据保留，但旧 Work 程序接口不再执行。完整规则见 [升级说明](upgrade-v3.md)。
