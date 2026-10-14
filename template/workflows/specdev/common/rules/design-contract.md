# UI 设计权威、批准与继承

P 创建 UI 包，或 S/T/I/C/W 消费 UI 决定时读取。纯 LOGIC 和没有 UI 影响的 change 不强制生成 DESIGN；不能以缺少 UI 工件阻塞独立的后端工作。

## 三层产物与 owner

| 层 | 位置 | 权威与 owner |
|---|---|---|
| 项目设计基线 | <Path>{roots.state}/specdev/design/DESIGN.md</Path> | 跨 change 的视觉语言、语义 token、组件与交互规范；唯一正式写入 owner 为 A |
| Change 设计合同 | <Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path> | 本 change 的页面、任务流、状态、响应式、基线引用与已批准例外；P 写入并维护 |
| 原型源码与证据 | <Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/design-system.md</Path> | P 拥有项目检测、候选来源、HTML/CSS/JS 源码、验证和批准证据；不再重复拥有设计规则 |

`design-id` 为当前 change 内最小未用的 `UI-NNN`。每个 UI 包引用同一 change DESIGN 的适用页面/规则；不能以新包覆盖其他已批准页面。comparison 与 final 是源码投影，项目内预览是有明确写集的临时验证。CONTEXT 拥有产品事实，ADR 拥有架构决定，Spec 拥有外部行为；DESIGN 不夺取这些职责。

初始化只创建空的 <Path>{roots.state}/specdev/design/</Path>，不从模板预填品牌或创建已批准 DESIGN。根项目已有 <Path>DESIGN.md</Path> 或其他设计规范时记录实际 locator 和 owner；不得自动覆盖或同步出第二套可写基线。

## 基线生命周期

1. 先按 design 索引的 app、页面、关键词或规则 ID 定位，再读取相关原文与 provenance。已有基线时核验 revision/digest 与代码；未声明 rebrand 的局部变更继承它。
2. 没有基线时先检测现有 token、组件和真实页面；新项目明确没有既有事实。P 在 change 内准备 baseline draft，观察值、用户约束与待验证建议分开。持久化草案不等于永久知识。
3. 默认先自动组合模板并生成 HTML，再把基线差异、候选、推荐最终页、关键交互和提升范围作为一次初始批准包展示。用户可以选择、组合、修改或拒绝；不逐项追问可由代码或模板推导的 CSS 偏好。首次批准前，将候选基线的确定 revision/designDigest 预绑定到 draft DESIGN，以 draft 状态及包内发布记录明确它尚未发布，并连同候选完整字节 SHA-256、HTML 摘要及当前基线 CAS 条件一并展示。这样批准涵盖最终规范内容；发布后仅验证同一内容落盘。临时发布状态保存在包/回执中，不写入会改变 designDigest 的规范正文。

4. 包获批后，P 通过 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/design-knowledge-gateway.md</Path> 请求 A 创建首次永久基线；该嵌入网关保持调用方原 owner，不执行整项归档。P 无永久目录直写权。已有基线的普通 change 仅记录 delta，不能借初始批准覆盖永久基线。正式 baseline 的不可变快照保存到 <Path>{roots.state}/specdev/design/revisions/{revision}.md</Path>，`revision` 来自网关验证的 DESIGN-NNNN；恢复和历史 change 按引用版本读取，不静默替换为 current。

5. 实施与验证后，A 在归档阶段按同一网关评估共享规则，生成 promotion diff 并在原授权范围内写入；一次性页面内容、未采纳方向、纯原型设想不提升。保持原 ID、来源和替代关系；未提升内容随 change 归档。

基线冲突、未知 owner、未闭合事务或相关锁只阻塞永久写入及依赖分支。仍可完成独立的检测、草案和候选，但不得把未成功发布的基线当作已存在。正式写入前后遵循 activation-and-memory 的定位、事务检查、原子写入与回读。

## 批准与失效

用户批准绑定具体 change DESIGN 内容、基线版本和原型文件摘要，并记录可回读的确认来源。发布批准的 record.path/sha256 绑定不可追加改写的本次确认快照；LOG 追加其定位和回执。项目根已有设计规范时保留原 owner，以 derived-readonly 和根文件字节摘要明确只读派生关系。模板推荐和 Agent 自评不构成人类批准。用户已指定方向或已授权自主组合时直接完成 HTML；仍需取得最终 HTML/交互与设计合同的集中确认，不额外要求重复的风格选单。

HTML、交互、设计合同、引用基线或影响布局的输入变化时，旧批准只对原摘要有效。先标记受影响部分待重新确认，完成新证据后再批准；无关页面不重新访谈。多个原型包与历史失败包并存时按 `--prototype-id UI-NNN` 选择本次目标，不能以任意一个 ready 包掩盖当前包失败。

## 下游硬引用

- **S**：UI 范围的 Spec 明确引用 change DESIGN、项目基线版本与原型 ID；将页面/状态映射到 AC。设计未批准或漂移时 UI 合同不可 Ready，返回 P。
- **T**：UI Ticket 使用 ui_change=true、design_ref={revision,digest,pages,acceptance}，Map 引用同一版本和适用规则；实现票明确只读设计来源、组件复用边界与视觉/交互验收。不可让执行者重新选风格。
- **I**：预检重算 design_ref 引用和摘要；按已批准设计实现，在 Evidence 的 Design Conformance 记录 digest/page/AC 与真实页面、原型差异、视口及任务证据。发现设计无效返回 P，行为冲突返回 S，不能修改设计文件给实现偏差补票。
- **C**：规范轴读取适用 DESIGN 与批准证据，区分规则偏离、未验证 UI 与可接受实现差异；审查不代替用户确认。
- **W**：solution comment 只保留 change DESIGN、指定 UI 包和 comparison/final 的定位与证据。探索原型不是 child change 的默认批准；child 复用时必须绑定自身范围并验证引用。

下游必须实际读取引用内容；仅写路径或模板中的 `approved` 文本不算已消费。纯 LOGIC 仍用自身 logic.md/hash/浏览器合同，不生成虚假 UI DESIGN。

## 质量与证据

先做独立的视觉/任务 critique，再做可机械验证的 audit，最后按严重程度修复和 polish。检查产品特征、层级、字体、密度、色彩语义、完整状态、键盘/focus、缩放、触屏、长文案、响应式和 reduced motion。审美反模式是诊断提示，用户约束与已批准项目体系优先；检测器无告警不证明设计优秀。

浏览器证据必须来自实际打开的本次产物，保存工具、环境、视口、操作、结果和截图相对路径。至少覆盖桌面与窄屏，适用手势单独操作；模拟 viewport 不证明真实触屏。无浏览器时可交付 draft，但不能 ready。原型 mock 只证明原型，不证明真实服务、生产性能或真实用户研究。

schema 与 hash 校验由 <Path>{roots.workflows}/specdev/common/tools/design-artifacts.mjs</Path> 和 <Path>{roots.workflows}/specdev/specdev-p-prototype/scripts/validate-design-package.mjs</Path> 承担；通过结构校验后仍需上述人工批准及运行证据。归档引用按 `--stage archived` 验证，不能用活动 change 的路径判断历史失效。
