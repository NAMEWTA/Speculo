# Upstream Assess：先评估上游，再决定如何集成

[手册首页](../README.md) · [Command 目录](README.md) · [源入口](../../template/commands/upstream-assess/COMMAND.md)

**业务 ID：** `command/upstream-assess`

## 什么时候用

维护 fork，想知道上游推进到哪里、与你的定制有何冲突、哪些改动值得接入。这个 Command 做冻结检查点评估，不自动 merge、commit、push，也不创建别的 workflow change。

## 准备什么

有效 workspace/config、目标仓库、产品分支与上游 refs，以及 fork 必须长期保留的业务不变量。入口先从当前目录向上寻找 `.agents/speculo/.speculo/workspace.json`，验证后解析绝对根与脚本；缺失或无效时提示 init，不在评估中初始化。首次只读发现可确认的 Git 事实，对无法唯一判断的配置询问；repository-map 与 customization-map 先形成内存候选，是否保存取决于本次模式。

```text
明确调用 command/upstream-assess，评估当前 fork 与已在本地存在的 upstream refs。
核对我们必须保留的定制，输出冻结 SHA、差异、冲突和风险；本次不 fetch 或集成。
```

默认离线。`--dry-run` 从第一次配置准备到返回都不写项目文件、Git 对象、index 或 refs。首次没有 repository-map 时，把完整的内存 JSON 直接输入 `assess --dry-run --repository-map-stdin`，代替 `--repository-map <file>`；输出包含输入摘要和 `persisted: false`，不先创建临时项目文件。候选不完整就返回缺失字段，不猜测 refs。

```text
node <absolute-command-root>/upstream-assess/scripts/upstream-sync.mjs assess --root <absolute-project-root> --state-root <absolute-command-state-root> --repository-map-stdin --topic upstream-review --dry-run
```

该示例的 JSON 通过子进程 stdin 输入；所有路径先解析为真实绝对路径。合并模拟在项目外临时对象数据库运行并清理；自定义 merge driver 不在只读评估中执行，需要它时会明确停止。普通评估才在 Command namespace 保存配置、运行记录和报告。

需要刷新网络时，明确授权配置 remotes 的实际 refs/tags 刷新范围后单独使用 `--fetch`；它会写 Git 对象、FETCH_HEAD，可能更新 refs/tags，不能与 `--dry-run` 合用。失败刷新使用现存 refs 并标 stale，不把 cached 当成最新。

## 三种检查点不能混淆

| 事实 | 含义 |
|---|---|
| 观测 upstream tip | 本次看见上游到了哪里 |
| 可选 mirror tip | 本地镜像引用到了哪里 |
| 已集成 checkpoint | 产品分支历史证明真正接入了哪里 |

fetch 成功不能推进已集成 checkpoint。报告分别列 Git 确认冲突、自动合并重叠、定制合同风险和 dirty-worktree 重叠；没有文本冲突也可能破坏定制语义。

## 评估后怎么办

根据报告选择 SpecDev 等后续 Work，明确实施范围。只有外部实际集成完成且用户要求记录后，才进入 record-integration：它验证指定 merge commit 可从产品 ref 到达、精确 upstream 父节点匹配冻结目标，再更新记录；它自己不执行集成。这是独立状态写入入口，不接受 dry-run、fetch 或 stdin 候选参数，避免忽略预览选项后落盘。

ref 缺失、checkpoint 不在产品或上游历史、多 merge-base、配置越界等情况会停止并保留证据。不要手工改 checkpoint 假装同步完成。
