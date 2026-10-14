---
schema_version: 1
artifact: change-design
change: <YYYY-MM-DD-topic>
revision: 1
status: draft
scope: [<app-or-surface-scope>]
baseline: null
prototype_ref:
  id: UI-001
  digest: <computed-prototype-sha256>
selection:
  candidate_id: candidate-a
tokens:
  <semantic-token>: <resolved-value>
pages:
  - id: PAGE-001
    route: <project-relative-route-or-screen>
    task: <primary-user-task>
    states: [default, loading, empty, error]
    acceptance: [<observable-acceptance>]
overrides: []
confirmation: null
updated_at: <ISO-8601>
---

# Change Design: <功能名称>

本文件是当前 change 的视觉与交互合同，由 P 拥有。使用 <Path>{roots.workflows}/specdev/common/rules/design-contract.md</Path> 与 <Path>{roots.workflows}/specdev/common/schemas/change-design.schema.json</Path>。替换占位符并计算摘要；draft 不等于批准，模板也不产生授权。

## Scope and Baseline

- **用户、任务与成功条件：**
- **页面模式：** 操作 / 阅读 / 转化 / 体验；按 surface 决定。
- **基线：** 永久设计的 revision/digest 与实际使用的 rule IDs。
- **明确保持项、排除项和用户约束：**
- **产品/架构来源：** 当前 CONTEXT、ADR、Spec 的适用 locator。

无基线时先形成 baseline-draft，并在首次集中确认包中明确其内容。确认前用待发布候选的确定 revision/designDigest 填入 `baseline: {revision, digest}` 并在原型包中记录 pending publication；不得猜测版本。A 发布后核验同一 snapshot，再登记已取得的确认并设 approved；发布失败保持 draft/blocked。

## Selected Direction

主模板及辅助维度、任务适配理由、首屏结构、主要路径、内容层级和关键交互。候选来源引用原型包的结构化清单，不复制上游全文。

## Tokens and Components

frontmatter tokens 是本次解析后的精确值，正文说明用途。列出继承的共享组件、允许新增的变体和复用边界；CSS 是可运行投影，不能另建相互冲突规则。

## Pages and Interaction

逐页说明入口、主要操作、完整状态、反馈、取消/重试/撤销、权限与离开/返回行为，关联 PAGE/AC ID。页面清单与 frontmatter 保持一致，写明不适用状态原因。

## Responsive and Accessibility

桌面/窄屏布局、必要断点、密度变化、键盘/focus、语义、对比度、缩放、长中文/本地化、触屏与 reduced motion。每条重要要求给出实际验证方式。

## Baseline Overrides

frontmatter overrides 记录 `rule_id`、`reason`、`scope`；正文解释替代影响和当前 change 边界。无偏离写 none。更改外部行为返回 Spec owner，架构冲突返回 ADR owner，不能用 DESIGN 擅自裁决。

## Confirmation and Handoff

展示 HTML 和交互后记录真实用户确认：`confirmation: {by: user, at, record, record_digest, digest}`。digest 使用 design-artifacts 的 designDigest，排除 confirmation/status/updated_at；prototype_ref.digest 使用当前候选组成与运行文件摘要。record 为当前 change 内固定确认快照的相对 locator；record_digest 为其完整字节 SHA-256，快照正文必须包含当前 designDigest、prototype_ref.digest 和 baseline.digest，并记录真实用户决定及范围。LOG 只追加快照定位，不能把后续持续追加的文件当作固定确认快照。变更内容或基线使原确认失效，重新验证受影响范围。

- **原型源码与检测证据：** <Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/design-system.md</Path>
- **实际浏览器证据：** <Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/evidence/browser.json</Path>
- **Spec AC / Ticket / implementation evidence 绑定：**
- **归档候选：** 可跨 change 复用的规则与实际采用证据；未验证或一次性内容不提升。
