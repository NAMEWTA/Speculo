# Context Scan Phase

## 输入

- 用户提出的计划、需求、设计或问题
- `.speculo/.config/RULES.md` 和用户明确指出的项目规则、设计约束或长期文档
- 仓库中的 `CONTEXT.md`、`CONTEXT-MAP.md`、`docs/adr/` 和相关代码
- 本 workflow 入口文件中的内置领域拷问指引

## 产物

- `.speculo/dev/<change>/context-map.md`，由 `../_templates/grill-context-map-template.md` 填写

## 填写引导

1. 先探索仓库事实，不向用户询问可从文件中确认的问题。
2. 记录存在的领域术语来源、ADR 来源、关键模块和调用者。
3. 标出缺失的术语表、缺失 ADR 或与用户描述冲突的代码事实。
4. 只记录事实和待确认项，不在本阶段做方案裁决。
5. 若根目录存在 `CONTEXT-MAP.md`，先读取它以判断涉及哪个上下文；若只有根 `CONTEXT.md`，按单上下文处理；若都不存在，只记录“缺少术语表”，不在本阶段创建。

## 边界

- 不直接修改项目 `CONTEXT.md` 或 ADR；修改动作留到 Decision Grill 阶段确认后执行。
- 不创建实现计划或 PRD。

## 完成准则

- `context-map.md` 无残留 `[TODO:]`
- 已列出下一阶段必须追问的最高优先级问题
