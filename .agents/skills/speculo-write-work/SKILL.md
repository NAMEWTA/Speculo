---
name: speculo-write-work
description: 编辑一个 Speculo workflow Work 入口及其分支文件；仅在 Work 职责、change 工件、状态路由、完成标准或 Path 指针需要改变时使用。
---

# Speculo Write Work

Work 把一个明确阶段从已知输入推进到可验证产物和下一路由。

## 读取

先定位本次目标、真实调用方和相关验证。纯文字修正核对局部事实即可；结构或行为变化时使用 [作者协议](../_shared/authoring-protocol.md)，按其中条件选择共享参考，不默认通读整个仓库。Work 输入、产物、生命周期或路由变化时读 [Work 合同](references/work-contract.md)，再按目标分支读取领域运行合同及相关相邻 Work。 已加载且未变化的规则可复用。

## 路由

1. 明确输入、唯一输出 owner、状态转换、change 生命周期和副作用边界。
2. 按恢复、判断、产物、验证、状态、路由排序；分支协议和模板下沉到直接 reference。
3. 更新同名 Work 入口及必要资源；使用生成器更新领域 SKILL 的 AUTO-INDEX。
4. 按 [验证选择](../_shared/validation-gates.md) 检查实际变化；生命周期变化覆盖新建/恢复、缺失输入、失败和成功路由。

## 停止条件

输入不可定位、owner 冲突、路径越界、状态 schema 不兼容、失败会推进完成状态或引用失效时停止受影响分支，继续独立且已授权的工作。
