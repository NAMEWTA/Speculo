# Style Selection Protocol

在检测完成并已生成 2-4 个功能候选后使用。每轮只关闭一个决策层，每次回答立即写入设计系统主文档；已确认内容不重复询问。

## 决策顺序

1. **产品与平台**：确认主用户、最高频任务、桌面/Web/移动优先级及是否真正跨端。
2. **信息架构**：从全局侧栏、双层导航、列表-详情、画布/检查器、仪表盘网格、内容中心中选择 shell 或明确组合。
3. **密度与排版**：选择 Compact、Default、Comfortable 或 Touch，并确认 UI/正文/代码字体角色。
4. **色调与主题**：选择暖中性、冷中性、单色、品牌强调或媒体深色；确认 light、dark、system 或 both。
5. **形状与层级**：确认主圆角组、边框/表面/阴影职责、常驻区与浮层差异。
6. **交互与运动**：确认点击、异步、危险操作、拖动、键盘、触屏和 reduced-motion 行为。
7. **跨端重排**：确认侧栏、检查器、表格、工具栏、hover 工具在窄屏的任务级替代。
8. **可视收束**：打开 comparison，选择一个候选、拒绝其余候选，或明确哪些区域组合；不得只说“更现代”。

## 候选说明合同

每个候选必须包含：风格 id、适用任务、布局变化、token 摘要、三项关键交互、平台策略、现有 UI 的保留/调整/替换项、研究项目、迁移成本和不适用风险。候选必须在信息层级或操作入口上有结构差异，不能只是颜色与文案变化。

候选数读取 `<Path>{roots.state}/specdev/config.json</Path>` 的 `planning.ui_design_default_candidates` 与 `planning.ui_design_max_candidates`，两者必须落在 2-4。事实只支持两个方向时可以少于默认值；达到配置上限前也不得为了凑数引入不适合产品的风格。

## 八种风格路由

| 风格 | 首选任务 | 避免场景 |
|---|---|---|
| dense-ide | 数据库、API、日志、专业开发工具 | 低频消费级表单 |
| monochrome-console | Agent 管理、本地控制台、运行监控 | 品牌内容与媒体浏览 |
| soft-personal-ai | 个人 AI、轻量桌面助手 | 极端数据密度和大表格 |
| responsive-web | 自托管 Web、PWA、多设备访问 | 强原生手势为核心的移动产品 |
| mobile-supervisor | 审批、通知、远程监督 | 手机内完整复刻 IDE |
| cross-platform-workspace | 桌面/Web/移动 Agent 工作区 | 只需单页面内容展示 |
| local-first-content | 笔记、知识库、长内容 | 监控大盘和媒体墙 |
| media-first | 相册、视频、资产库 | 长表单和密集代码任务 |

需要 CRM、仪表盘、画布、客服、通信或 API 分窗时，读取 `<Path>{roots.workflows}/specdev/P-prototype/design-library/product-pattern-index.md</Path>`，将产品布局模式与最接近的视觉风格组合，并记录组合边界。

## 持久化与阻塞

每轮更新 frontmatter、`Style Decision` 中的选择表和拒绝理由，再原子重读。用户尚未看到候选 HTML、回答含糊或多个方向仍会改变核心布局时保持 `status: selecting`。用户不在线时可以继续补充可发现证据和生成候选，但不得替用户选择最终风格。

**完成标准**：八层决策均为 confirmed 或明确 not-applicable；被拒绝候选有原因，组合候选有逐区域边界，最终方向能直接生成 token 与页面。
