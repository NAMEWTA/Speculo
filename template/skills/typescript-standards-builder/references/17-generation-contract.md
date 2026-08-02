# 项目 Skill 生成合同

## 正式规范源

唯一正式源：

```text
.agents/skills/typescript-standards/
```

该目录至少包含：

- `SKILL.md`
- `references/00-project-profile.md`
- 与项目实际技术栈相关的主题参考文档。
- `references/10-review-checklist.md`
- `references/11-decisions-and-exceptions.md`

## 主 Skill 内容

Frontmatter：

```yaml
---
name: typescript-standards
description: 当前项目专属的 TypeScript 编码、目录、测试与工程质量规范。处理本项目中的 TypeScript、React、Node.js、构建、测试、重构和代码审查任务时必须使用。
---
```

正文保持精简，包含：

- 项目和适用范围。
- 规则优先级。
- 8～12 条核心不可违背规则。
- 参考文档路由。
- 修改代码前后的检查流程。
- 例外处理入口。

不要把全部规范塞回主文件。

## 项目画像

`00-project-profile.md` 应记录：

- 项目类型和主要框架。
- 运行环境和包边界。
- 包管理器、模块系统和 TypeScript 配置。
- 格式、Lint、测试、构建和 CI 工具。
- 自动生成和豁免目录。
- 规范适用范围。

## 规则来源标记

每个主题文件应在顶部列出规则来源：

```md
> 来源：仓库事实 + 用户确认 + 默认基线
```

兼容例外写入 `11-decisions-and-exceptions.md`，不要散落为无法追踪的隐式规则。

## 精简与裁剪

- 非 React 项目不生成 React 章节。
- 非 Node 项目不生成 Node/CLI 章节。
- 没有国际化需求时不生成国际化规则。
- 不复制未采用工具的配置示例。
- 保留固定默认原则对应的实际规则，但使用项目自己的阈值、命名和命令。

## 重定向文件

`.agents/skills/typescript--standards/SKILL.md`：

```md
本文件仅用于路径兼容；必须立即读取并完整遵循项目根目录下的 `.agents/skills/typescript-standards/SKILL.md`。
```

`.claude/skills/typescript-standards/SKILL.md`：

```md
必须先读取并完整遵循项目根目录下的 `.agents/skills/typescript--standards/SKILL.md`，禁止在未读取该文件时执行任何 TypeScript 相关任务。
```

两个文件均必须恰好一句话，不添加 Frontmatter。

## 更新已有 Skill

若目标目录已存在：

1. 读取当前主 Skill、引用文档和例外记录。
2. 将仓库新事实与旧决定区分。
3. 保留仍有效的项目特有规则。
4. 对冲突规则询问用户，不静默覆盖。
5. 更新决策记录和修订日期。
6. 报告新增、修改、删除和保留内容。

## 验证

- 主 Skill Frontmatter 可解析。
- 所有相对引用存在。
- 无孤立或重复规范文件。
- 没有独立 Orca 附录。
- 固定默认原则已进入对应主题。
- 两个重定向文件内容完全符合合同。
