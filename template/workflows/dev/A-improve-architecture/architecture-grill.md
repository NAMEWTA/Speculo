# Architecture Grill Phase — 质询所选候选并沉淀

## 输入

- 用户选中的深化候选（来自 `architecture-review.html`）
- `speculo/.speculo/dev/<change>/architecture-candidates.md`
- `speculo/.speculo/.config/context/CONTEXT.md`、`speculo/.speculo/.config/adr/`

## 产物

- `speculo/.speculo/dev/<change>/architecture-design.md`
- 经用户确认后更新 `.config/context/`、`.config/adr/`

## 填写引导

1. 用 `../../../skills/grill-me/SKILL.md` 与用户走设计树：约束、依赖、深化后模块形态、接缝后面是什么、哪些测试存活。
2. 决策结晶时按 `../M-domain-modeling/M-domain-modeling.md` 内联沉淀：深化模块用了 CONTEXT 没有的概念 → 加术语；锐化了模糊术语 → 更新 CONTEXT；用户以关键理由否决候选 → 按 ADR 三判据决定是否记 ADR。
3. 想探索深化模块的备选接口时，按 `../../../vendor/codebase-design/DESIGN-IT-TWICE.md` 的「设计两次」并行子代理模式。

## 边界

- 写 `.config/context/` 或 `.config/adr/` 前必须经用户确认。
- 本 phase 不落地代码实现（交由 `../03-tdd/03-tdd.md`）。

## 完成准则

- 选中候选的接口、依赖策略与适配器、存活测试已记入 `architecture-design.md`
- 决策结晶处的术语 / ADR 已按 `../M-domain-modeling/` 沉淀（经用户确认）
- `architecture-design.md` 无残留 `[TODO:]`
- `.status.json` 写入 `selected_candidate`，置 `architecture_status: designed`
