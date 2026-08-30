---
id: specdev/prototype
type: workflow-entry
workflow: specdev
name: UI 设计原型
description: 检测现有项目的 UI 事实，按产品任务推荐并逐步选择设计风格，生成持久化设计系统文档、多风格 HTML 对照和可运行 HTML/CSS/JS 原型。
keywords: [prototype, UI 原型, 风格检测, 设计系统, HTML, CSS, 交互, design tokens]
---

# UI 设计原型

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/specdev/README.md</Path>`，再执行本入口。

本 Work 的主导词是**设计定向**：先从项目事实识别现状，再让用户看到基于功能而非流行色推荐的候选，最后把选择固化为既可阅读又可运行的 UI 设计包。P 不修改生产 UI；后续 S、Tickets 和 I 以设计包为视觉与交互权威。

## 输入与所有权

- 必需输入：目标项目或新产品设想、核心用户任务，以及当前 SpecDev change。
- 可选输入：现有代码、页面、截图、设计 token、品牌约束、ADR、Spec、调查和用户明确给出的参考产品。
- 项目事实权威：依赖清单、样式源码、组件实现、路由、真实页面、测试和可复现截图；仅凭依赖名称不得断言实际风格。
- 用户决定权威：产品方向、候选风格、密度、色调、字体气质、圆角、交互反馈和跨端优先级。

P 拥有 `<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/</Path>`。其中 `design-id` 使用当前 change 内最小未占用的 `UI-NNN`；目录中的设计系统主文档是唯一设计权威，comparison 和 final 文件均由它或其中已记录的候选决定派生。P 不写永久 research namespace，不创建 branch/worktree，不提交生产代码。

## 流程

1. **创建或恢复设计包**：读取 change 与 `<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/design-system.md</Path>`。不存在时从 `<Path>{roots.workflows}/specdev/P-prototype/design-system-template.md</Path>` 创建，写入 `status: detecting` 并原子重读；存在时只询问尚未确认的高影响选择。
2. **检测现有风格**：加载 `<Path>{roots.workflows}/specdev/P-prototype/detect-existing-style.md</Path>`，穷尽技术栈、布局、视觉 token、组件状态、响应式与可访问性证据。新项目明确记录 `project_kind: new`，不伪造检测结果。
3. **建立功能候选**：读取 `<Path>{roots.workflows}/specdev/P-prototype/design-library/INDEX.md</Path>`，依据产品任务、平台和信息密度从八种风格及六种布局中推荐 2-4 个候选。每个候选写明适合原因、需要保留/调整/替换的现有事实、参考项目和迁移成本。
4. **逐项选择并持久化**：加载 `<Path>{roots.workflows}/specdev/P-prototype/style-selection-protocol.md</Path>`。每轮只处理一个决策层；每个答案立即写回设计系统主文档并重读。高影响偏好未确认时保持 `status: selecting`，不得自行标记 Ready。
5. **生成可视对照与最终原型**：加载 `<Path>{roots.workflows}/specdev/P-prototype/generate-design-package.md</Path>`。为每个候选生成独立 comparison variant，再生成 comparison 索引。用户确认或明确组合后，把最终 HTML/CSS/JS 作为具名代码块写入设计系统主文档，再物化到 final 目录。
6. **验证并封板**：运行 `<Path>{roots.workflows}/specdev/P-prototype/tools/materialize-prototype.mjs</Path> --check` 和 `<Path>{roots.workflows}/specdev/P-prototype/tools/validate-design-package.mjs</Path>`；随后运行 SpecDev `--stage prototype`。全部通过且选择闭合后设置 `status: ready`，更新 `works_run` 并清空 `current_work`。缺少项目事实或用户决定时设置 `blocked` 并保留恢复位置。
7. **返回路由**：返回设计包、comparison 和 final 的完整路径、验证命令与结果、未决问题和下一 Work。需要补足产品决定时返回 G；需要写外部行为合同返回 S；需要拆实施工作返回 Tickets；已有 Ready Ticket 才返回 I。Wayfinder 调用时只把设计包与 comparison locator 写入对应 solution comment。

## 完成标准

- 现有项目的检测结论逐项有项目相对证据；新项目明确没有既有风格。
- 候选由功能、平台和密度推导，不只更换颜色；用户已看到每个候选的独立 HTML。
- 设计系统主文档完整包含 UI 结构、CSS token、交互 JS 和最终 HTML 源码，并记录研究出处与拒绝理由。
- comparison 索引可导航到 2-4 个候选，final HTML 可离线运行；桌面与移动宽度不存在空白、遮挡或无意横向溢出。
- 字体、间距、圆角、色彩、层级、控件状态、异步反馈、响应式、键盘、focus 和 reduced motion 均有明确合同。
- Markdown 代码块与 `final/` 文件逐字一致，schema、局部校验和 SpecDev stage 校验全部通过。
- 设计包不包含机器绝对路径、敏感值、生产数据写入、发布动作或未授权的生产实现。

## 子文件引用

- 检测：`<Path>{roots.workflows}/specdev/P-prototype/detect-existing-style.md</Path>`，仅在步骤 2 加载。
- 选择：`<Path>{roots.workflows}/specdev/P-prototype/style-selection-protocol.md</Path>`，仅在步骤 4 加载。
- 生成：`<Path>{roots.workflows}/specdev/P-prototype/generate-design-package.md</Path>`，仅在步骤 5 加载。
- 模板：`<Path>{roots.workflows}/specdev/P-prototype/design-system-template.md</Path>`，创建设计包时加载。
- 设计库：`<Path>{roots.workflows}/specdev/P-prototype/design-library/INDEX.md</Path>`，建立候选或查具体规则时渐进读取。
- Schema：`<Path>{roots.workflows}/specdev/P-prototype/design-package.schema.json</Path>`。
