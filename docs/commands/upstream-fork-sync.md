# Upstream Fork Sync：先评估上游，再决定如何集成

[手册首页](../README.md) · [Command 目录](README.md) · [源入口](../../template/commands/upstream-fork-sync/COMMAND.md)

**业务 ID：** `command/upstream-fork-sync`

## 什么时候用

维护 fork，想知道上游推进到哪里、与你的定制有何冲突、哪些改动值得接入。这个 Command 做冻结检查点评估，不自动 merge、commit、push，也不创建别的 workflow change。

## 准备什么

有效 workspace、目标仓库、产品分支与上游 refs，以及 fork 必须长期保留的业务不变量。首次只读发现可确认的 Git 事实，对无法唯一判断的配置询问后保存 repository-map 和 customization-map。

```text
明确调用 command/upstream-fork-sync，评估当前 fork 与已在本地存在的 upstream refs。
核对我们必须保留的定制，输出冻结 SHA、差异、冲突和风险；本次不 fetch 或集成。
```

要刷新网络 refs 时明确允许 fetch；默认离线。完整冻结快照的 dry-run 不写 state 或评估 change，正常评估会在命令自己的 namespace 保存配置、运行记录和报告。

## 三种检查点不能混淆

| 事实 | 含义 |
|---|---|
| 观测 upstream tip | 本次看见上游到了哪里 |
| 可选 mirror tip | 本地镜像引用到了哪里 |
| 已集成 checkpoint | 产品分支历史证明真正接入了哪里 |

fetch 成功不能推进已集成 checkpoint。报告分别列 Git 确认冲突、自动合并重叠、定制合同风险和 dirty-worktree 重叠；没有文本冲突也可能破坏定制语义。

## 评估后怎么办

根据报告选择 SpecDev 等后续 Work，明确实施范围。只有外部实际集成完成且用户要求记录后，才进入 record-integration：它验证指定 merge commit 可从产品 ref 到达、精确 upstream 父节点匹配冻结目标，再更新记录；它自己不执行集成。

ref 缺失、checkpoint 不在产品或上游历史、多 merge-base、配置越界等情况会停止并保留证据。不要手工改 checkpoint 假装同步完成。
