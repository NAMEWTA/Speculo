# Canonical：在网页 AI 中单独使用一个方法

[手册首页](README.md) · [本地安装入门](getting-started.md) · [单文件持久化合同](../template/canonical/README.md)

如果你的 AI 宿主不能读取本地项目、没有安装 Speculo，或只想把一种方法带到另一个平台，可以使用 Canonical。它是自包含的 Markdown 能力文档，按本身规则交付可保存的文件；它不会给网页 AI 凭空增加本地 shell、网络权限或后台执行能力。

## 选一份适合任务的文件

当前共有 12 份，按能力而非所有 Work 一一生成：

| 领域 | 文件 | 什么时候用 |
|---|---|---|
| SpecDev | [Grill](../template/canonical/canonical-specdev-grill-with-docs.md) | 澄清一个 change 的关键决定 |
| SpecDev | [Spec](../template/canonical/canonical-specdev-spec.md) | 把事实与决定整理成规格 |
| SpecDev | [Tickets](../template/canonical/canonical-specdev-tickets.md) | 拆分已明确的实施工作 |
| SpecDev | [Goal Plan](../template/canonical/canonical-specdev-goal-plan.md) | 形成目标计划与恢复依据 |
| SpecDev | [Wayfinder](../template/canonical/canonical-specdev-wayfinder.md) | 探索大需求与 change 边界 |
| Learning | [Lesson](../template/canonical/canonical-learning-lesson.md) | 完整课程讲解 |
| Learning | [Question](../template/canonical/canonical-learning-question.md) | tutor 问答或 explore 深挖 |
| Media | [Content](../template/canonical/canonical-media-content.md) | 研究、简报与内容拆解 |
| Media | [Visual](../template/canonical/canonical-media-visual.md) | 风格菜单与视觉提示词 |
| Media | [Video](../template/canonical/canonical-media-video.md) | 视频工程、验证和交付 |
| Media | [Operations](../template/canonical/canonical-media-operations.md) | 本地渠道草稿和数据复盘 |
| Person | [Steelman Deliberation](../template/canonical/canonical-person-steelman-deliberation.md) | 双向论证与决策 |

## 第一次怎样用

1. 打开上表文件，在 GitHub 读取完整原文或下载 Markdown，不只复制预览的一小段。
2. 将这一份能力文档放入宿主支持的项目知识/附件/指令输入中。
3. 提供真实问题和必需材料；文件自包含的是方法，不能代替缺少的业务资料或第三方配方。
4. 明确希望得到的成果、范围和允许的动作。

```text
请按我提供的完整 Canonical 文档工作。
主题是理解 HTTP 缓存，我是新手，希望先回答问题再听讲解。
请保存本轮权威工件；若没有写文件能力，给出完整可保存的 FILE bundle，并标明尚未落盘。
```

## 产物与继续方式

便携命名空间是 `ai-workspace/`，通常含全局状态、`changes/<change>/`、该能力产物和必要的知识/归档位置。它与本地安装的 `.agents/speculo/.speculo/` 是两套不同合同，不要直接混用状态文件。

宿主能写文件时，应返回真实路径并回读；不能写时，返回逐文件完整内容和明确路径的 FILE bundle，你自行保存。不能把一段建议或聊天摘要当作已保存的跨会话记忆。

继续时把当前状态和该能力的权威工件一并提供，让 AI 恢复实际 change、阶段和未决问题。没有文件工具或旧工件时，应报告缺失，不假装记得上次进度。

## 能力与许可边界

- 没有渲染工具时，只能交付视频工程与未渲染说明。
- 精确复用外部画风配方仍需要完整原文与适用许可，菜单不等于配方包。
- 计划和输出不自动授权发布、部署或远程写入。
- 需要本地工程、事务和多文件领域管理时，使用[完整安装](getting-started.md)。

Canonical 是生成物。维护者修改对应源和生成器，然后重建与验证；不要直接在成品里维护第二套规则。
