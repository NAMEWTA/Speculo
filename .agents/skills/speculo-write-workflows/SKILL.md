---
name: speculo-write-workflows
description: 编辑完整 Speculo workflow 包；仅在 INDEX、README、Work 集、common、`_state`、schema、AUTO-INDEX 或 workflow 路由需要改变时使用。
---

# Speculo Write Workflows

Workflow 组合多个 Work、权威工件和可恢复状态；每个状态字段和路径只有一个 owner。

## 读取

先读 [`../_shared/authoring-protocol.md`](../_shared/authoring-protocol.md)、[`../_shared/project-model.md`](../_shared/project-model.md)、[`../_shared/path-and-reference-rules.md`](../_shared/path-and-reference-rules.md)、[`references/workflow-contract.md`](references/workflow-contract.md) 和 [`references/index-template.md`](references/index-template.md)，再定位目标 workflow 的 INDEX/README、Work 入口、common、schema/tools、`_state` 和调用方。不要默认读取其他 workflow。

## 路由

1. 记录输入、状态 schema、Work 图、namespace、owner、完成/阻塞/归档语义。
2. 重复规则进入 `common/rules`；至少两个 Work 独立调用的能力进入 `common/skills`；单 Work 规则留在 Work 目录。
3. 修改 INDEX/README/seed/Work 或 schema；使用生成器重建 AUTO-INDEX，不手改生成区块。
4. 验证被动发现不激活状态机、初始化/恢复/阻塞/成功/归档路径和生成器幂等性。

## 停止条件

状态 owner 冲突、路由不可达、namespace 越界、静态引用失效、seed 含运行时实例或验证失败时停止。
