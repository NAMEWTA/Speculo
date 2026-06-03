---
id: caveman
type: skill
name: Caveman
description: 启用超压缩沟通模式以降低 token 消耗；当 command/caveman 被调用或用户要求极简技术表达时使用。
---

# Caveman Skill Wrapper

## 何时使用

当用户要求 `caveman mode`、少 token、极简表达，或调用对应 command 时使用。

## 输入

- 用户要求的沟通模式或当前对话上下文

## 输出

- 保留技术准确性的压缩回复风格

## 执行步骤

1. 读取并严格遵循 `source/SKILL.md`。
2. 该 skill 影响对话风格，不直接产生 `.speculo/` 产物。
3. 退出条件以 `source/SKILL.md` 为准。

## 渐进披露

- `source/SKILL.md`：启用或关闭压缩模式时读取。
