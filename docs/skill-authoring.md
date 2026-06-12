# Skill 编写指南（开发者向）

本文档面向**框架扩展者**：你想新增一个可复用的原子能力。
`speculo-write` skill（`speculo/skills/speculo-write/`）按本规范执行，完整内化规范见其 `references/skill-authoring-sop.md`，本文是它遵循的契约。

## 创建步骤

```bash
mkdir -p speculo/skills/<name>/{references,scripts,examples}
touch speculo/skills/<name>/SKILL.md
```

## 强制约束

1. 入口必须命名为 `SKILL.md`。
2. skill 目录应自包含，复制到其他项目后仍能工作。
3. skill 禁止直接写 `speculo/.speculo/` 或 `.status.json`；持久化由调用它的 workflow 或 command 负责。
4. 大段背景放在 `references/`，可执行辅助脚本放在 `scripts/`，示例输入输出放在 `examples/`。

## SKILL.md 骨架

```markdown
---
id: <name>
type: skill
name: <人类可读名>
description: <一句话能力说明；含触发场景，第三人称，可与相近 skill 区分>
---
```

正文固定章节：`## 何时使用`、`## 输入`、`## 输出`、`## 执行步骤`、`## 渐进披露`。完整模板与写作要点见 `speculo/skills/speculo-write/references/skill-authoring-sop.md`。

## 渐进披露策略

`SKILL.md` 只放触发条件、输入输出和主流程。细节放入 `references/`，让 AI 在需要时再读；脚本说明必须写清输入、输出和失败行为。

## 复制即可用合格线

复制 `speculo/skills/<name>/` 到任何项目后，任何 AI 工具只读 `SKILL.md` 就能判断是否使用、需要哪些输入、会产生什么输出。
