---
id: specdev/prototype
type: workflow-entry
workflow: specdev
name: 原型
description: 在获授权的临时 branch/worktree 中构建一次性 Logic 或 UI 原型，回答一个明确设计问题并持久化答案、资产定位和清理状态。
keywords: [prototype, 原型, logic, UI, variant, 一次性代码, 设计问题]
---

# 原型

原型是**回答一个问题的一次性代码**。P 不交付生产实现，也不把原型代码提升到 main；它把答案和一手资料 locator 交给后续 G/S/Tickets/I。

## 输入与所有权

- 一个可精确陈述的问题，来自用户、G、Spec 或 `<Path>{roots.state}/specdev/changes/{change}/investigation/{investigation-id}.md</Path>`；
- 相关代码、组件系统、领域上下文和 ADR；
- 获授权的项目可写范围及临时 branch/worktree。

P 拥有 `<Path>{roots.state}/specdev/changes/{change}/prototypes/{prototype-id}/record.md</Path>`。代码写在临时 workspace 的项目路径附近；state 只保存项目相对 Path、branch、commit 和可迁移 `workspace_ref`。

## 流程

1. **锁定问题**：一个 record 只回答一个问题。业务逻辑、状态转换或数据形态使用 Logic；页面外观、信息层级或交互布局使用 UI。问题含糊且用户不在线时按周围代码选择，并在 record 写明假设。
2. **建立临时工作区**：按 `<Path>{roots.workflows}/specdev/common/skills/dev-worktree/SKILL.md</Path>` 创建/恢复工作区。创建 branch、commit 或删除 worktree 分别遵守现有授权边界；路径名明确包含 prototype。
3. **执行分支**：Logic 加载 `<Path>{roots.workflows}/specdev/P-prototype/logic-prototype.md</Path>`；UI 加载 `<Path>{roots.workflows}/specdev/P-prototype/ui-prototype.md</Path>`。两个分支都把完整状态呈现给评审者，不依赖生产数据写入。
4. **捕获答案**：使用 `<Path>{roots.workflows}/specdev/P-prototype/prototype-record-template.md</Path>` 记录问题、运行方法、资产、验证反馈、赢家/拒绝项、结论、promotion target 和清理状态，原子重读。
5. **关闭或阻塞**：答案已确认时 `status: answered`；用户选择不继续时 `discarded`；原型无法回答问题时 `blocked` 并说明缺失输入。Wayfinder 调用时，把 record/branch/URL 写入当前 Ticket 的 solution comment，并只关闭该 Ticket。
6. **验证与路由**：使用 `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>` 的 `--stage prototype` 校验当前 change。需要产品决定返回 G，需要外部行为合同返回 S，需要执行计划返回 Tickets；生产实现只进入 I。

## 完成标准

- 只有一个问题和一个正确分支；
- 原型极易运行，完整状态可见；
- 临时 branch/worktree 与项目路径可恢复且不含机器绝对路径；
- 原型没有测试、生产数据库依赖或伪装成生产代码；
- 答案、资产、赢家、拒绝项、promotion target 和清理状态完整；
- main 不保留落选变体、switcher 或原型外壳；
- Wayfinder Ticket、solution comment 与 prototype record 可互相定位。

## 子文件引用

- Logic：`<Path>{roots.workflows}/specdev/P-prototype/logic-prototype.md</Path>`
- UI：`<Path>{roots.workflows}/specdev/P-prototype/ui-prototype.md</Path>`
- Record：`<Path>{roots.workflows}/specdev/P-prototype/prototype-record-template.md</Path>`
- Schema：`<Path>{roots.workflows}/specdev/common/schemas/prototype-record.schema.json</Path>`
