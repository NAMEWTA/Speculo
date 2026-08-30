# 38 个产品模式映射

本索引覆盖 snapshot 中 19 个基础项目、8 个 Claude Code 客户端和 11 个多端个人应用。映射用于找到相似约束和进一步阅读入口，不是统一评分、设计排名或许可建议。

## 研究入口

- D：`<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/research/data-dev-tools.md</Path>`
- P：`<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/research/productivity-collaboration.md</Path>`
- C：`<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/research/creative-ai-communication.md</Path>`
- A：`<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/research/claude-code-modern-clients.md</Path>`
- M：`<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/research/personal-multiplatform-apps.md</Path>`

结构化事实源是 `<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/data/projects.json</Path>` 和 `<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/data/extended-projects.json</Path>`。

## 基础项目（19）

| 项目 | 核心布局/产品模式 | 最适合借鉴 | 入口 |
|---|---|---|---|
| Supabase Studio | 产品轨 + 模块侧栏 + 数据工作区 | 设计系统分层、数据工具 shell、语义颜色 | D |
| Grafana | 顶栏 + 可停靠菜单 + 仪表盘画布 | 主题契约、密集 dashboard、插件化 UI | D |
| Metabase | 应用栏 + 集合侧栏 + 查询/仪表盘 | 低门槛分析、主题封装、命令面板 | D |
| DBeaver Community | 对象树 + 多标签编辑器 + 辅助视图 | 极高密度桌面工作台、上下文命令 | D |
| Directus | 模块轨 + 集合导航 + 多布局 + 侧栏 | schema 驱动界面、扩展点、多视图 | D |
| Appsmith | 实体树 + 画布 + 属性面板 + 调试器 | 低代码编辑器、检查器、调试反馈 | D |
| DBX | 连接树 + tabs + 编辑/数据区 + 工具面板 | 轻量现代桌面端、可调多窗格、AI/MCP | D |
| Plane | 可调侧栏 + List/Kanban/Gantt + 详情 | 同一数据多视图、peek 侧栏、高效工作台 | P |
| AppFlowy | 插件式 workspace + 文档/数据库视图 + 原生响应式导航 | local-first、真正跨端、移动任务重排 | P |
| Twenty | 表格/管道 + 记录侧面板 + 移动导航首页 | 元数据驱动业务 UI、对象表、记录面板 | P |
| Cal.com / Cal.diy | 管理配置 shell + 独立公开预约流程 | 后台与客户界面分离、预约表单、品牌定制 | P |
| Outline | 文档树 + 聚焦编辑器 + 情境协作工具 | 低干扰写作、树导航、命令栏 | P |
| AFFiNE | Page/Edgeless 双模 + 浮动/可调侧栏 | local-first、多模文档、响应式侧栏 | P |
| Penpot | 无限画布 + 左侧对象/资产 + 右侧 inspector | 专业画布、原生设计 token、设计到代码交付 | C |
| Excalidraw | 全屏画布 + 漂浮工具岛 + 情境属性 | 低学习成本画布、上下文工具、手绘语言 | C |
| Open WebUI | 会话侧栏 + 单列聊天 + 模型/工具/RAG workspace | AI 会话 IA、文字缩放、渐进披露 | C |
| Chatwoot | 导航 + 队列列表 + 会话 + 客户上下文 | 密集主从、实时状态、客服上下文 | C |
| Mattermost | 团队轨 + 频道栏 + 消息流 + 可调线程栏 | 长期复杂协作、主题、线程上下文 | C |
| Hoppscotch | 协议导航 + 请求/响应 split panes + collection 栏 | API 工作流、可调 pane、协议切换 | C |

## Claude Code 客户端（8）

| 项目 | 平台与产品模式 | 可用于回答 | 入口 |
|---|---|---|---|
| CloudCLI / Claude Code UI | Web/PWA/Electron；会话 drawer/sidebar + transcript + tool/git/file/terminal views | 自托管响应式 Agent UI、工具视图编排 | A |
| Happy | iOS/Android/Web/macOS；活动会话 inbox + event timeline + 移动 composer/approval | 移动监督、通知、权限审批 | A |
| Paseo | iOS/Android/Web/Electron/CLI；workspace/agent 侧栏 + chat/editor tabs + file/diff/terminal panes | 真正多端、多个 Agent 与 workspace | A |
| Opcode | Windows/macOS/Linux；项目/会话浏览 + agent console + analytics/MCP/config modules | 单色本地控制台、管理与分析 | A |
| CodePilot | Electron；侧栏 + chat workspace + split sessions + provider/MCP/skills/media | 柔和个人 AI、模块化桌面 workspace | A |
| cdesktop | 响应式 Web；sessions + transcript/terminal/diff + plan/files/preview，最多四 cells | IDE 密度、多 pane 验证工作区 | A |
| TOKENICODE | Tauri 桌面；会话导航 + chat + local file/editor tools | 本地桌面 AI、编辑器与会话组合 | A |
| OpenClaudgents | Tauri 桌面；多会话 chat + agent-team status visualization | 新兴的 Agent 团队状态可视化；成熟度不足时只作概念线索 | A |

## 多端个人应用（11）

| 项目 | 平台实现/共享模式 | 可用于回答 | 入口 |
|---|---|---|---|
| Notesnook | React/React Native/Electron；共享 editor、core、theme，平台 view 分层 | 内容编辑、主题共享、Web/桌面/移动壳分工 | M |
| Standard Notes | React/React Native/Electron；共享领域模型，Web/desktop 与 mobile shells | 加密笔记的领域共享与平台壳 | M |
| Joplin | React/React Native/Electron monorepo；共享 sync/data，平台 UI packages | local-first 同步、多端内容编辑 | M |
| Logseq | ClojureScript/React/Electron；共享 block model/domain，平台 capability 分层 | 块编辑器、知识图谱与平台能力 | M |
| LocalSend | Flutter 单一跨平台 UI | 高共享率的桌面/移动任务流 | M |
| Immich | SvelteKit Web + Flutter mobile；共享 API/领域词汇，UI 分开 | 媒体优先、拍摄/上传与桌面浏览职责分离 | M |
| Bitwarden Clients | 共享 Web/browser/desktop stack；native mobile 独立 | 共享领域与安全流程、平台原生 UI 取舍 | M |
| RustDesk | Rust core + Flutter 跨平台 UI | 深度本地能力与统一多端控制界面 | M |
| Element Web and Element X | 共享协议、SDK、设计语言；Web React，移动 SwiftUI/Compose | 协议一致、平台原生实现、实时通信 | M |
| Home Assistant Frontend | 响应式 Web UI 嵌入 iOS/Android companion shells | Web-first 多端、设备能力由 native shell 补充 | M |
| Actual Budget | 共享 React UI；browser worker 与 desktop Node data adapters | local-first 财务工具、共享 UI 与数据适配器 | M |

## 使用映射

1. 先从当前原型的对象、任务、密度和平台筛选 1-3 个项目。
2. 读取对应详细报告，区分源码事实、界面观察和研究者推断。
3. 只迁移结构性选择和当前问题所需模式；不要复制品牌、受限源码或迁移中的旧组件。
4. 需要视觉起点时，再将项目与 `<Path>{roots.workflows}/specdev/P-prototype/design-library/style-index.md</Path>` 的八种样板关联。样板的“主要参考”是综合实现，不等于项目逐像素复制。
