---
name: speculo-write-command
description: 编辑 Speculo 的 `template/commands/` Command 包入口；仅在一次调用的 scope、确认、报告、command state 或 skill 编排需要改变时使用。
---

# Speculo Write Command

Command 是一次调用的薄编排入口；复用方法归 references 或领域私有 skill，跨调用状态机归 workflow。

## 读取

先定位本次目标、真实调用方和相关验证。纯文字修正核对局部事实即可；结构或行为变化时使用 [作者协议](../_shared/authoring-protocol.md)，按其中条件选择共享参考，不默认通读整个仓库。一次调用的 scope、授权、报告或 state 变化时读 [Command 合同](references/command-contract.md)。 已加载且未变化的规则可复用。

## 路由

1. 明确触发、参数、scope、报告路径、state、skill 输入/输出和副作用 owner。
2. 将破坏性、Git、远程 API、发布、部署和不可逆迁移放在明确确认门之后；未确认只产生 dry-run/计划。
3. 更新Command 包入口和必要调用方；报告永不覆盖，执行后重读源、目标、state 和报告。
4. 按 [验证选择](../_shared/validation-gates.md) 检查实际变化；副作用合同覆盖 dry-run、获批执行、冲突与失败。

## 停止条件

scope/owner 不明、报告冲突、确认缺失、静态引用失效、状态漂移或部分失败时停止受影响分支并列出已完成/未完成清单。
