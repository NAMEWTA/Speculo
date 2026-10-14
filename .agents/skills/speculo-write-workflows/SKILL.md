---
name: speculo-write-workflows
description: 编辑完整 Speculo workflow 包；仅在 领域 SKILL、manifest、Work 集、common、`_state`、schema、AUTO-INDEX 或 workflow 路由需要改变时使用。
---

# Speculo Write Workflows

Workflow 组合多个 Work、权威工件和可恢复状态；每个状态字段和路径只有一个 owner。

## 读取

先定位本次目标、真实调用方和相关验证。纯文字修正核对局部事实即可；结构或行为变化时使用 [作者协议](../_shared/authoring-protocol.md)，按其中条件选择共享参考，不默认通读整个仓库。领域注册、状态或路由变化时读 [workflow 合同](references/workflow-contract.md)；仅改领域索引结构时读 [索引模板](references/index-template.md)。 已加载且未变化的规则可复用。

## 路由

1. 记录输入、状态 schema、Work 图、namespace、owner、完成/阻塞/归档语义。
2. 重复规则进入 `common/rules`；至少两个 Work 独立调用的能力进入 `common/skills`；单 Work 规则留在 Work 目录。
3. 修改 领域 SKILL/运行合同/seed/Work 或 schema；使用生成器重建 AUTO-INDEX，不手改生成区块。
4. 按 [验证选择](../_shared/validation-gates.md) 覆盖实际改变的发现、状态及恢复路径；涉及生成物时验证幂等性。

## 停止条件

状态 owner 冲突、路由不可达、namespace 越界、静态引用失效、seed 含运行时实例或验证失败时停止受影响分支，继续独立且已授权的工作。
