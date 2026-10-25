# 模板选择、组合与集中确认

检测项目并读取适用基线后使用。规则 owner 为 <Path>{roots.workflows}/specdev/common/rules/design-contract.md</Path>；本协议拥有候选生成与用户反馈方式。

## 1. 决定设计自由度

- 已有成熟 UI：继承品牌、token、共享组件、用户术语和主要操作习惯；只补本次页面/状态，不能因缺少 DESIGN 文件而重新设计。
- 用户明确选模板、参考产品或组合：将其转为绑定约束，其他维度依据项目事实补齐。
- 未指定风格：按任务、使用场景、信息量、输入设备与内容特征自动推荐主模板及辅模板，直接生成 HTML；不要求用户先选择字体、色值或圆角。
- 新产品或明确 redesign：允许替换视觉体系，保留真实内容、功能、约束与已承诺品牌资产。仅缺失会改变产品方向或交付范围的事实才先做集中澄清。

先判断页面成功方式：操作任务、阅读理解、说服转化或内容体验；同一产品不同页面可不同。局部改动沿用所属页面，不重开全产品风格竞赛。

## 2. 加载少量模板并组合

从 <Path>{roots.workflows}/specdev/specdev-p-prototype/design-library/INDEX.md</Path> 按标签定位候选，只展开选中条目和所需源 DESIGN。产品布局需特殊模式时读取 <Path>{roots.workflows}/specdev/specdev-p-prototype/design-library/product-pattern-index.md</Path>。参考项目提供可复用系统和设计纪律，不授权复制商标、虚构客户或加载外部执行代码。

已有基线和库资料不足以支持当前交互或复用判断时，调用 <Path>{roots.workflows}/specdev/common/skills/research/SKILL.md</Path> 补查具体缺口，P 将结果写入当前原型包的来源与候选说明。资料足够时复用已有来源；关键原始 URL 与借鉴维度按 <Path>{roots.references}/research-and-reuse/research-contract.md</Path> 传递到实际采用的设计内容。

每个候选记录稳定 `id`、`template_id`、`primary_reference`、`auxiliaries`、适合原因 `rationale`、`structural_difference`、共同 `task_id` 与离线 `entry`。每个辅助来源只负责明确 `dimension`，如排版、密度、导航或反馈。来源 `sources` 保存 locator，以及已核实的 URL/revision/license/digest；未知值不能编造。

一个候选必须统一字体角色、色彩语义、间距/密度、形状/深度、导航与状态词汇。主模板拥有整体视觉语言；辅助模板的规则需转译到同一 token/组件语法。组合说明列出继承、调整、替换与冲突裁决，不把多个完整风格叠加到同一页面。不同候选应有任务结构或交互上的实质差异，不能只换配色。

## 3. 候选数量与默认推荐

无显式数量时读取 <Path>{roots.state}/specdev/config.json</Path> 的 `planning.ui_design_default_candidates` 与 `planning.ui_design_max_candidates`：缺省 3、上限 4；事实只支持两个可行方向时可交付两个并说明依据。不为凑数生成不适合产品的方向。

用户显式指定一个、多个或超过配置上限的数量时，准确交付该数量，在 `candidate_count_override: {count, request}` 记录数量和原始请求来源；这是本次包覆盖，不修改全局 config。单方向或继承既有设计不能擅自减少用户明确数量。用户已选定设计或允许自主组合时，可明确标出推荐 final，但推荐不表示已批准。浏览器取证前，selected_candidate 与 change selection 固定当前展示方案；这只是待确认目标，status/confirmation 决定其批准状态。

## 4. HTML 后的一次集中确认

先生成全部候选、comparison 和可操作的推荐 final，并完成浏览器检查。展示同内容、相同保真度的候选，给出推荐及理由、项目基线、change 设计差异、关键状态和已知限制。用户可选候选、组合指定维度、要求修改或拒绝；不使用八轮逐项偏好问答。

首次项目基线、最终 HTML/交互与 change DESIGN 作为同一个批准包。确认记录绑定具体内容摘要及永久写入范围。用户反馈引起的修改先更新草案、HTML和证据再集中确认，不在旧确认上更换内容。尚无真实答复时保留 `awaiting-confirmation`，可继续独立检测，不代替用户批准。

获批后核验 `selected_candidate` 与 change DESIGN 的 `selection.candidate_id` 和实际展示方案一致；拒绝理由和组合边界保存在包中。高影响未决问题不为 ready。

**完成标准**：候选数、任务、模板和来源可追踪；基线继承/例外有依据；真实 HTML 已展示，最终方向和全部适用规则有同一可核验批准。
