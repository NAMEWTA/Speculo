# 研究来源、快照与复用边界

## 固定快照

| 字段 | 值 |
|---|---|
| 上游仓库 | `open-source-ui-research`（authoring 来源；安装后的运行时不依赖上游工作树） |
| snapshot commit | `49b565913c52f4867456e609696625157f19b930`（短 SHA `49b5659`） |
| commit subject | `feat: add visual UI style gallery` |
| 研究基准日 | `2026-08-30` |
| 快照目录 | `<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/</Path>` |
| tracked file count | 38 |

`research-snapshot` 来自该 commit 的 Git archive，保留全部 tracked 相对结构和字节内容。它包含 Markdown 研究、两个 JSON 数据集、综合 CSS token、八个 HTML 页面、共享 HTML/CSS/JS、Playwright 测试、package lock、本地 Lucide、三张 JPEG、截图和 attribution；不包含 `.git/`、`node_modules/` 或未跟踪的 `test-results/`。

快照内 `.gitignore` 文件是 tracked 内容，必须保留。不要因目录名以点开头而把它们误判为上游 Git 元数据。

## 内容清单

| 分区 | 数量 | 权威内容 |
|---|---:|---|
| 根文件 | 3 | `.gitignore`、README、研究方法 |
| data 分区 | 2 | 19 个基础项目 + 8 个 Claude Code 客户端 + 11 个多端项目，共 38 个记录 |
| reference 分区 | 2 | 综合 token 与使用约束 |
| report 分区 | 1 | 总报告、六种布局、跨项目结论和验收清单 |
| research 分区 | 7 | 项目模板、研究索引和五份分类研究 |
| ui-gallery 分区 | 23 | 8 个风格页、总览、样式、脚本、测试、依赖锁、Lucide、图片、截图与 attribution |
| 合计 | 38 | 与 pinned Git tree 一致 |

## 证据等级

| 等级 | 证据 | 可以支持 |
|---|---|---|
| A | 仓库 design token、主题、组件源码、官方设计系统 | 精确颜色、字号、圆角、间距、组件状态和实现 |
| B | 官方架构/产品文档、Storybook、官方截图 | 技术栈、信息架构、主要布局和交互流程 |
| C | 可访问产品界面与发布说明 | 带“约”的界面观察与响应行为 |
| D | 第三方资料、搜索摘要、研究者推断 | 线索或明确标注的推断，不支持精确数值 |

精确值必须回到 A 级证据。GitHub stars 是 2026-08-30 附近的近似快照，只说明关注度，不代表 UI 质量。许可字段是研究提示，不构成法律意见；代码公开也不自动等于 OSI 开源或允许直接复用。

## 资产与 attribution

三张本地示例图来自 Unsplash，具体 photo ID 与署名记录在 `<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/ui-gallery/assets/ATTRIBUTION.md</Path>`。Lucide 是本地 vendored UMD 1.37.0，ISC license。复制包含图片或 Lucide 的样板时同时携带 attribution，并在进入生产前由项目 owner 重新核对依赖与许可。

逐项目源码许可差异很大，包括 Apache/MIT/MPL、AGPL、BSL、混合目录许可和 source-available restrictions。设计库用于研究结构、任务和交互；没有明确许可与项目需要时，不复制项目源码或品牌表达。

## 快照不变性

- 原型运行只读 snapshot；复用资产只写入当前 change 的设计包。
- snapshot 的相对链接、资源路径和 package lock 保持原样。
- 更新研究库必须显式选择新的完整 commit，重新从 Git tracked tree 建立整个 snapshot，重新核对 38 项映射、链接、文件清单、二进制 hash、测试和 attribution；不得混入上游工作树的未提交文件。
- 更新后在本文件替换 commit、基准日和 inventory，并将差异作为研究升级审查，不做静默刷新。

原始方法与局限见 `<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/METHODOLOGY.md</Path>`；总报告见 `<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/report/OPEN_SOURCE_UI_RESEARCH_2026.md</Path>`。
