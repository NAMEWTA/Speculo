---
id: to-issues
type: skill
name: To Issues
description: 将计划、规格或 PRD 拆成可独立接手的垂直切片 issue；当 dev/I 或其他 dev workflow 需要嵌入切片分解时使用。
---

# To Issues Skill Wrapper

## 何时使用

当 dev workflow 需要把 PRD、计划、设计或修复方案拆解成 HITL/AFK 垂直切片时使用。

## 输入

- PRD、计划、设计记录、bug 诊断结论或当前对话上下文
- 项目 issue tracker 配置和标签词汇表（如果存在）
- 调用方指定的切片产物路径

## 输出

- 垂直切片清单、依赖关系、HITL/AFK 标记和验收标准
- 可选的外部 issue 引用

## 执行步骤

1. 读取并严格遵循 `source/SKILL.md`。
2. 默认只生成本地切片计划；只有 tracker 已配置且用户明确要求时才发布 issue。
3. 作为嵌入步骤调用时，把输出归档到调用方 workflow 的当前 change 目录。
4. 本 skill 不直接写 `.speculo/` 或 `.status.json`。

## 渐进披露

- `source/SKILL.md`：需要分解垂直切片或发布 issue 时读取。
