---
name: speculo-write-work
description: 编辑一个 Speculo workflow Work 入口及其分支文件；仅在 Work 职责、change 工件、状态路由、完成标准或 `<Path>` 指针需要改变时使用。
---

# Speculo Write Work

Work 把一个明确阶段从已知输入推进到可验证产物和下一路由。

## 读取

先读 [`../_shared/authoring-protocol.md`](../_shared/authoring-protocol.md)、[`../_shared/project-model.md`](../_shared/project-model.md)、[`../_shared/path-and-reference-rules.md`](../_shared/path-and-reference-rules.md)、[`references/work-contract.md`](references/work-contract.md)，再定位目标 workflow 的 INDEX/README、当前 Work、相邻 Work、适用 common rules/schema/tools 和真实调用方。只读取当前分支需要的工件。

## 路由

1. 明确输入、唯一输出 owner、状态转换、change 生命周期和副作用边界。
2. 按恢复、判断、产物、验证、状态、路由排序；分支协议和模板下沉到直接 reference。
3. 更新同名 Work 入口及必要资源；不手改 generator-owned INDEX。
4. 演练新建/恢复、缺失输入、验证失败和成功路由；再运行 workflow 与项目 gates。

## 停止条件

输入不可定位、owner 冲突、路径越界、状态 schema 不兼容、失败会推进完成状态或引用失效时停止。
