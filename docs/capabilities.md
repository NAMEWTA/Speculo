# 能力总览

领域入口按任务路由到具体 Work。安装一个领域时会包含其 Work 和必要参考；宿主可以只暴露领域入口，也可以按 ID 直接暴露常用 Work。下面列的是可选择的能力，不是一轮任务必须经过的阶段。

| 领域 | Work 数 | 入口与使用指南 |
| --- | ---: | --- |
| SpecDev（包含原 Ops） | 21 | [领域技能](../template/workflows/specdev/SKILL.md) · [使用指南](workflows/specdev.md) |
| Learning | 9 | [领域技能](../template/workflows/learning/SKILL.md) · [使用指南](workflows/learning.md) |
| Media | 7 | [领域技能](../template/workflows/media/SKILL.md) · [使用指南](workflows/media.md) |
| Person | 2 | [领域技能](../template/workflows/person/SKILL.md) · [使用指南](workflows/person.md) |

## Work

### 软件开发与运维

| ID | 任务方法 |
| --- | --- |
| `specdev/project-deploy` | [项目与共享服务部署](../template/workflows/specdev/specdev-d-project-deploy/SKILL.md) |
| `specdev/host-manage` | [服务器环境与治理](../template/workflows/specdev/specdev-h-host-manage/SKILL.md) |
| `specdev/environment-setup` | [控制端初始化](../template/workflows/specdev/specdev-i-environment-setup/SKILL.md) |
| `specdev/server-connect` | [服务器接入与登记](../template/workflows/specdev/specdev-s-server-connect/SKILL.md) |
| `specdev/inventory-view` | [服务器与部署资产视图](../template/workflows/specdev/specdev-v-inventory-view/SKILL.md) |
| `specdev/archive-and-consolidate` | [归档与沉淀](../template/workflows/specdev/specdev-a-archive-and-consolidate/SKILL.md) |
| `specdev/code-review` | [代码审查](../template/workflows/specdev/specdev-c-code-review/SKILL.md) |
| `specdev/delivery` | [开发交付](../template/workflows/specdev/specdev-d-delivery/SKILL.md) |
| `specdev/diagnose-bugs` | [诊断 Bug](../template/workflows/specdev/specdev-d-diagnose-bugs/SKILL.md) |
| `specdev/grill-with-docs` | [需求评估、决策追问与补足遗漏](../template/workflows/specdev/specdev-g-grill-with-docs/SKILL.md) |
| `specdev/implement` | [实现与验收](../template/workflows/specdev/specdev-i-implement/SKILL.md) |
| `specdev/init-setup` | [初始化设置](../template/workflows/specdev/specdev-i-init-setup/SKILL.md) |
| `specdev/learn` | [学习与图解](../template/workflows/specdev/specdev-l-learn/SKILL.md) |
| `specdev/goal-plan` | [目标规划、里程碑与适度拆分](../template/workflows/specdev/specdev-p-goal-plan/SKILL.md) |
| `specdev/prototype` | [逻辑与 UI 原型](../template/workflows/specdev/specdev-p-prototype/SKILL.md) |
| `specdev/retro` | [整体会话复盘与知识沉淀](../template/workflows/specdev/specdev-r-retro/SKILL.md) |
| `specdev/review-architecture` | [架构审查](../template/workflows/specdev/specdev-r-review-architecture/SKILL.md) |
| `specdev/spec` | [编写 Spec](../template/workflows/specdev/specdev-s-spec/SKILL.md) |
| `specdev/tickets` | [可独立交付的切片与必要票据](../template/workflows/specdev/specdev-t-tickets/SKILL.md) |
| `specdev/triage` | [请求评估与分诊](../template/workflows/specdev/specdev-t-triage/SKILL.md) |
| `specdev/wayfinder` | [大需求调研、证据比较与范围探索](../template/workflows/specdev/specdev-w-wayfinder/SKILL.md) |

### 学习

| ID | 任务方法 |
| --- | --- |
| `learning/archive` | [冷归档](../template/workflows/learning/learning-a-archive/SKILL.md) |
| `learning/assess-and-plan` | [评估背景并设计课程](../template/workflows/learning/learning-a-assess-and-plan/SKILL.md) |
| `learning/consolidate` | [主题整合](../template/workflows/learning/learning-c-consolidate/SKILL.md) |
| `learning/goal` | [目标学习（目标模式）](../template/workflows/learning/learning-g-goal/SKILL.md) |
| `learning/homework` | [课程作业与评审](../template/workflows/learning/learning-h-homework/SKILL.md) |
| `learning/init-setup` | [初始化学习系统](../template/workflows/learning/learning-i-init-setup/SKILL.md) |
| `learning/lesson` | [完整课程讲解](../template/workflows/learning/learning-l-lesson/SKILL.md) |
| `learning/question` | [深度探究与苏格拉底问答课](../template/workflows/learning/learning-q-question/SKILL.md) |
| `learning/review` | [延迟保持与周期复习](../template/workflows/learning/learning-r-review/SKILL.md) |

### 创作

| ID | 任务方法 |
| --- | --- |
| `media/brief` | [选题与母内容简报](../template/workflows/media/media-b-brief/SKILL.md) |
| `media/deconstruct` | [对标结构拆解](../template/workflows/media/media-d-deconstruct/SKILL.md) |
| `media/hand-drawn` | [固定画风提示词](../template/workflows/media/media-h-hand-drawn/SKILL.md) |
| `media/init-setup` | [创作者初始化](../template/workflows/media/media-i-init-setup/SKILL.md) |
| `media/publish-draft` | [多渠道本地草稿](../template/workflows/media/media-p-publish-draft/SKILL.md) |
| `media/retro` | [数据复盘与模板沉淀](../template/workflows/media/media-r-retro/SKILL.md) |
| `media/video` | [可验证代码视频](../template/workflows/media/media-v-video/SKILL.md) |

### 分析与论证

| ID | 任务方法 |
| --- | --- |
| `person/mao-zedong-cognitive-os` | [毛泽东 · 认知操作系统](../template/workflows/person/person-m-mao-zedong-cognitive-os/SKILL.md) |
| `person/steelman-deliberation` | [双向钢人论证](../template/workflows/person/person-s-steelman-deliberation/SKILL.md) |

## 显式命令

八个命令为 `status`、`handoff`、`project-maintenance`、`git-repository-audit`、`git-history-squash`、`upstream-assess`、`source-code-zip`、`speculo-feedback`。宿主曝光 ID 为 `command/<名称>`；实际调用与结果见 [命令指南](commands/README.md)。

## Skills Hub

Hub 使用完整包安装；命令/API 参数、素材和参考文件随包保留。只安装当前需要的包，不默认加载全部指导。

| ID | 专项能力 |
| --- | --- |
| `automation/grok-bot-team-steward` | 管家与对象盘点、导出、比较、具名恢复与核验 |
| `coding/gitea-repo` | Gitea/Forgejo API、仓库与协作对象管理 |
| `coding/github-repo-steward` | GitHub 仓库、stars 和授权范围内的治理 |
| `coding/vscode-fullstack` | VS Code Profile、本地/远程扩展、运行时与配置 |
| `design/photo-retouch` | 照片自然修饰、商品/证件/旅行等分支与图像检查 |
| `system/clash-client-profile` | 代理配置、DNS/TUN/规则链与性能排错 |
| `system/linux-dev-disk-cleanup` | Linux 磁盘与 inode、开发缓存、容器等清理 |
| `system/windows-dev-disk-cleanup` | Windows 卷、缓存、链接、VHDX 与开发环境清理 |
| `system/optimize-codex-config` | AI CLI 配置分析、真实工具 apply/verify/rollback |
| `system/proxy-region-locale` | 系统区域和时区的目标匹配、修改与恢复 |
| `system/system-health-audit` | 真实 CPU/内存/IO/磁盘证据与瓶颈判断 |
| `writing/align-intent` | 意图复述、约束和推断辨认、吸收纠正 |
| `writing/eli5` | 完整教学、短答、深挖、费曼与苏格拉底练习 |
| `writing/job-application` | 经历、岗位研究、简历、渲染、面试和提升 |
| `writing/ste-zh` | 中英文技术表达、术语一致和意义保真 |

具体源文件在 [skills-hub](../skills-hub/)。例如 `--hub-skills writing/eli5` 选择完整教学技能；宿主目标与工作流使用相同的 `--skill-targets`。

## 维护者方法

本仓库的 [speculo-author](../.agents/skills/speculo-author/SKILL.md) 按需提供 Workflow、Work、Skill、Command 的写作指导与重构核对方法。它不随用户项目安装。

旧能力与新入口的逐项关系，以及明确退出的编排/格式协议，见 [重构对应表](refactor-map.md)。
