---
name: specdev-p-prototype
description: "按需验证离线逻辑模型，或继承项目设计基线、按任务自动组合模板生成 HTML，经集中确认后形成 change DESIGN 并通过归档网关沉淀永久设计。"
metadata:
  speculo-kind: work-skill
  speculo-id: specdev/prototype
  speculo-domain: specdev
  speculo-contract-version: "2"
---

# 逻辑与 UI 原型

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/specdev/common/rules/domain-runtime.md</Path>`，再执行本入口。

本 Work 的主导词是**设计定向**：先定位项目设计与代码事实，再按用户任务组合设计模板，生成可操作 HTML 后集中确认，形成当前 change 的 DESIGN 合同。P 不修改生产 UI；S、Tickets、I 与审查必须读取已批准设计。

激活时读取 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`，按当前步骤定位输入和证据。

## 分支选择

逻辑/状态/规则验证读取 <Path>{roots.workflows}/specdev/specdev-p-prototype/references/logic-protocol.md</Path>，跳过下方 UI 专属步骤。UI 默认离线持久化，候选缺省 3 个、配置上限 4 个；用户显式数量覆盖缺省与上限并记录来源。只有用户明确要求项目内预览时读取 <Path>{roots.workflows}/specdev/specdev-p-prototype/references/project-preview-protocol.md</Path>；其临时写集与清理由该分支管理。

UI 分支必读 <Path>{roots.workflows}/specdev/common/rules/design-contract.md</Path>，用于区分永久基线、change DESIGN、原型源码、批准及其失效条件。

## 交互和逻辑状态

按项目风险验证正常、空、加载、失败、取消、重试、权限不足和恢复状态。复用既有 token/组件；主题、窗口边缘、响应式、键盘、focus、遮挡与可访问性均由真实项目需求决定，不搬 DSH 视觉常量。失败反馈遵守 <Path>{roots.workflows}/specdev/common/rules/error-handling.md</Path>，提示与有效数据有明确生命周期。原型只证明原型路径，不冒充生产或真实 API 验收。

## 输入与所有权

- 必需输入：目标项目或新产品设想、核心用户任务，以及当前 SpecDev change。
- 可选输入：现有代码、页面、截图、设计 token、品牌约束、ADR、Spec、调查和用户明确给出的参考产品。
- 项目事实权威：依赖清单、样式源码、组件实现、路由、真实页面、测试和可复现截图；仅凭依赖名称不得断言实际风格。
- 用户决定权威：明确的产品/设计约束、最终 HTML 和交互、设计合同及永久知识发布范围。可由代码或所选模板推导的视觉细节先作有依据的组合，不逐项询问。

P 拥有 `<Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/</Path>`，`design-id` 使用当前 change 内最小未占用的 `UI-NNN`。保留文件名 design-system.md，但它只拥有源码与证据；设计规则唯一保存在 change DESIGN。永久 <Path>{roots.state}/specdev/design/DESIGN.md</Path> 只可经 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/design-knowledge-gateway.md</Path> 由 A 发布，嵌入调用保持 P 原 owner。P 不直接写任何永久知识，不创建 branch/worktree，不提交生产代码。

## 流程

1. **创建或恢复设计包**：读取 change，定位项目基线的相关规则，再读取 `<Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>` 和当前包。使用 <Path>{roots.workflows}/specdev/specdev-p-prototype/assets/change-design-template.md</Path> 与 <Path>{roots.workflows}/specdev/specdev-p-prototype/assets/design-system-template.md</Path> 创建缺失草案；没有项目基线时另用 <Path>{roots.workflows}/specdev/specdev-p-prototype/assets/project-design-template.md</Path> 在当前包中准备候选，不写永久目录。恢复先核对批准摘要和 owner。
2. **检测现有风格**：加载 `<Path>{roots.workflows}/specdev/specdev-p-prototype/references/detect-existing-style.md</Path>`，穷尽技术栈、布局、视觉 token、组件状态、响应式与可访问性证据。新项目明确记录 `project_kind: new`，不伪造检测结果。
3. **组合设计模板**：读取 `<Path>{roots.workflows}/specdev/specdev-p-prototype/design-library/INDEX.md</Path>` 和 `<Path>{roots.workflows}/specdev/specdev-p-prototype/references/style-selection-protocol.md</Path>`，按任务、平台、密度和已有基线选择主模板及有明确职责的辅模板。用户已指定或允许组合时直接采用；未指定时推荐组合并记录理由，不阻塞于逐层选择。实际候选数尊重用户要求。
4. **先生成 HTML**：加载 `<Path>{roots.workflows}/specdev/specdev-p-prototype/references/generate-design-package.md</Path>`。以相同任务和内容生成候选 HTML、comparison 及推荐 final；将最终 HTML/CSS/JS 具名源码块物化。设计规则写入 change DESIGN 草案，源码包只链接规则。完成真实浏览器检查并通过设计包 --check-preview 后才提出集中确认。
5. **集中确认与首次基线**：展示同一批准包中的项目基线候选/当前版本、本 change 设计差异、HTML 及交互证据。用户可直接接受、选择其他候选或组合修改；修改后重新验证受影响内容。一次初始确认同时明确 HTML、change DESIGN 与首次永久基线发布范围；已有基线不在此流程自动提升 delta。批准前预绑定候选基线的确定 revision/digest；A 网关发布成功后回读并确认与批准包一致，再登记同一批准记录；缺少批准保持草案或 blocked。
6. **验证并封板**：运行 `<Path>{roots.workflows}/specdev/specdev-p-prototype/scripts/materialize-prototype.mjs</Path> --check` 与 `<Path>{roots.workflows}/specdev/specdev-p-prototype/scripts/validate-design-package.mjs</Path> --check-ready`。对照 `<Path>{roots.workflows}/specdev/specdev-p-prototype/assets/design-package.schema.json</Path>`，设计绑定、批准、浏览器证据与源码全门通过后才设置 ready；再运行 `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --stage prototype --prototype-id UI-NNN` 并回读，成功后将有效包与下一步导航写回原 README。失败恢复 blocked 并保留当前包与恢复位置。
7. **返回路由**：返回设计包、comparison 和 final 的完整路径、验证命令与结果、未决问题和下一 Work。需要补足产品决定时返回 G；需要写外部行为合同返回 S；需要拆实施工作返回 Tickets；已有 Ready Ticket 或就绪的完整 Direct Spec，且具有同范围实现授权时返回 I。Wayfinder 调用时只把设计包与 comparison locator 写入对应 solution comment。

## 完成标准

- 现有项目的检测结论逐项有项目相对证据；新项目明确没有既有风格。
- 候选由功能、平台和密度推导，数量满足用户要求或有依据的配置；用户已看到候选和最终可操作 HTML。
- 项目基线、change DESIGN 与源码包职责分离，批准绑定真实内容；首次基线只经 A 网关发布，后续 delta 等归档评估。
- comparison 导航覆盖实际候选，final HTML 可离线运行；真实桌面与窄屏观察没有未解决的空白、遮挡或无意横向溢出。
- 字体、间距、圆角、色彩、层级、控件状态、异步反馈、响应式、键盘、focus 和 reduced motion 均有明确合同。
- Markdown 代码块与 `final/` 文件逐字一致；S/T/I/C/W 有明确 DESIGN/版本/规则/原型引用；schema、局部校验和指定原型 stage 全部通过。
- 设计包不包含机器绝对路径、敏感值、生产数据写入、发布动作或未授权的生产实现。
