# Skill 编写指南（开发者向）

本文档面向**框架扩展者**：你想新增一个可复用的原子能力。

## 创建步骤

```bash
mkdir -p framework/skills/<name>/{references,scripts,examples}
touch framework/skills/<name>/SKILL.md
```

## 强制约束

1. 入口必须命名为 `SKILL.md`。
2. skill 目录应自包含，复制到其他项目后仍能工作。
3. skill 禁止直接写 `.speculo/` 或 `.status.json`；持久化由调用它的 workflow 或 command 负责。
4. 大段背景放在 `references/`，可执行辅助脚本放在 `scripts/`，示例输入输出放在 `examples/`。

## SKILL.md 骨架

```markdown
---
id: <name>
type: skill
name: <人类可读名>
description: <一句话能力说明>
---

# <Skill Name>

## 何时使用

<触发场景。>

## 输入

- <输入 1>
- <输入 2>

## 输出

- <输出形态>

## 执行步骤

1. <步骤>
2. <步骤>

## 渐进披露

- `<relative-reference>.md`：<何时读取>
- `scripts/<script>`：<何时运行>
```

## 渐进披露策略

`SKILL.md` 只放触发条件、输入输出和主流程。细节放入 `references/`，让 AI 在需要时再读；脚本说明必须写清输入、输出和失败行为。

## 复制即可用合格线

复制 `framework/skills/<name>/` 到任何项目后，任何 AI 工具只读 `SKILL.md` 就能判断是否使用、需要哪些输入、会产生什么输出。
