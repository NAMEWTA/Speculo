---
id: to-prd
type: skill
name: To PRD
description: 将当前上下文综合成 PRD 或执行计划；当 dev/02 需要从已知信息生成需求、实现决策和测试决策时使用。
---

# To PRD Skill Wrapper

## 何时使用

当 dev workflow 已完成足够上下文探索，需要把当前对话和代码理解沉淀成 PRD 时使用。

## 输入

- 当前对话上下文和已探索的代码库事实
- 领域术语、ADR、模块候选和测试目标
- 调用方指定的 PRD 产物路径

## 输出

- PRD、用户故事、实现决策、测试决策、范围边界和后续说明

## 执行步骤

1. 读取并严格遵循 `source/SKILL.md`。
2. 在 Speculo workflow 中调用时，把 PRD 归档到调用方指定的 `.speculo/dev/<change>/prd.md`。
3. 只有 tracker 已配置且用户明确要求时才发布外部 issue。
4. 本 skill 不直接维护 `.status.json`；状态由调用方 workflow 更新。

## 渐进披露

- `source/SKILL.md`：需要综合 PRD 时读取。
