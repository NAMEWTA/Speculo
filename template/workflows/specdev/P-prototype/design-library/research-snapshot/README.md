# Open Source UI Research

面向桌面端、Web 与移动软件设计的开源产品 UI/UX 研究库。

本项目通过源码、官方设计系统、产品文档和实际界面资料，拆解热门开源产品的：

- 信息架构与整体布局
- 技术栈与前端架构
- 色彩、字体、间距、圆角、阴影等视觉 token
- 导航、表格、表单、命令面板、反馈状态等交互模式
- 可复用的设计原则与落地建议

## 交付物

- [可视化 UI 风格样板库](ui-gallery/index.html)：8 个独立 HTML 页面，覆盖高密度 IDE、桌面控制台、个人 AI、响应式 Web、移动审批、真正多端、内容编辑与媒体优先风格；附可复制 token 和响应式实现。
- [综合研究报告](report/OPEN_SOURCE_UI_RESEARCH_2026.md)：基础 19 个项目总览、跨项目结论、布局/视觉/交互基线和验收清单。
- [Claude Code 现代开源客户端专项](research/claude-code-modern-clients.md)：CloudCLI、Happy、Paseo、Opcode、CodePilot、cdesktop、TOKENICODE、OpenClaudgents，分别覆盖桌面、Web、移动与跨设备方案。
- [多端个人应用对照](research/personal-multiplatform-apps.md)：Notesnook、Joplin、LocalSend、Immich、RustDesk、Actual Budget 等 11 个项目，按桌面/Web/移动分别总结。
- [数据与开发工具](research/data-dev-tools.md)：Supabase、Grafana、Metabase、DBeaver、Directus、Appsmith、DBX。
- [协作与生产力](research/productivity-collaboration.md)：Plane、AppFlowy、Twenty、Cal.com、Outline、AFFiNE。
- [创作、AI 与通信](research/creative-ai-communication.md)：Penpot、Excalidraw、Open WebUI、Chatwoot、Mattermost、Hoppscotch。
- [结构化基础项目清单](data/projects.json) 与 [扩展项目清单](data/extended-projects.json)：合计 38 个项目记录，供后续网站、筛选器或自动化消费。
- [设计 token 基线](reference/design-tokens.css) 与 [使用建议](reference/USAGE.md)：跨项目综合出的可实现起点。
- [研究方法](METHODOLOGY.md)：证据等级、选择标准、评分维度和局限。

## 研究原则

1. 优先引用 GitHub 源码、官方文档和官方设计系统。
2. 明确区分源码事实、界面观察和研究者推断。
3. 星标数等时效数据注明采集日期，不将其视为 UI 质量指标。
4. 对无法从公开资料精确确认的数值，不制造伪精度。
