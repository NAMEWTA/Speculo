---
id: person/index
category: person
name: Person Workflow AGENTS Guide
description: 以人物方法论为底座的工作流导航与渐进披露指引
keywords: [person, methodology, agents, 人物, 方法论, cognitive, 认知]
---

# Person Workflow AGENTS Guide

> ⚠️ **持久化铁律：本文件及所有 person workflow 的全部产物，必须且只能写入 `speculo/.speculo/person/<change>/`。绝对禁止写入项目根目录的 `.speculo/`、`temp/` 或其他任何非规范位置。**

本文件是 person 分类的 AGENTS 导航入口。进入时先读取 `speculo/.speculo/person-status.json`，再按其中 active change 读取 `speculo/.speculo/person/<change>/.status.json`，根据用户意图推荐横向 workflow。

> **命名铁律：** 所有 change 目录必须为 `YYYY-MM-DD-<kebab-name>`（例：`2026-06-12-mao-strategy-consult`）。不符合此格式的目录视为 `malformed`，仅汇报不自动操作。

## 渐进披露

1. 先读本文件，确认当前 person change、咨询模式和入口别名。
2. 选定入口后，只读取对应 workflow 入口文件（如 `M-mao-zedong-cognitive-os/M-mao-zedong-cognitive-os.md`）。
3. 进入具体 phase 时，再读取该 phase 文件、模板和被调用 skill wrapper。
4. 执行中如涉及项目硬约束、跨任务经验、人物方法论上下文、术语定义、ADR 或决策依据，必须参考 `../../.speculo/.config/` 下对应文件；`RULES.md` 的约束高于普通 workflow 文案。
5. 需要理解状态骨架、archive 或 `.config` 时，读取 `../../.speculo/AGENTS.md` 和相关子目录的 `AGENTS.md`。

## 入口别名

| 别名 | 入口 | 用途 |
|------|------|------|
| `person/M` | `M-mao-zedong-cognitive-os/M-mao-zedong-cognitive-os.md` | 以毛泽东方法论为底座的认知咨询：分析问题→制定战略→组织行动 |

## 进入协议

1. 若用户未指定 change，扫描 `speculo/.speculo/person-status.json` 和 `speculo/.speculo/person/*/.status.json`，列出 active changes。
   - **命名校验**：扫描时仅处理符合 `YYYY-MM-DD-<kebab-name>` 格式的目录。不符合的目录标记为 `malformed`，单独列出路径并提示用户修复或手动清理，不自动删除或重命名。
2. 若只有一个 active change，默认继续该 change；若有多个 active change，要求用户选择。
3. 若没有 active change，按用户意图创建新的 change 目录，**目录名必须为 `YYYY-MM-DD-<kebab-name>`**（使用当前日期，`<kebab-name>` 从用户意图提取），并初始化 `.status.json` 与 `speculo/.speculo/person-status.json`。
4. 推荐入口时优先使用用户显式别名；没有别名时按用户意图推荐一个横向 workflow。
5. 执行任何 workflow 前，读取该 workflow 入口文件、阶段文件和模板。
6. 执行中一旦需要项目规则、经验、上下文、术语或 ADR，先读取 `../../.speculo/.config/`，再继续判断或写入产物；除非用户明确要求或规则允许，不自动改写 `.config/`。

## 执行模式

- `mao`：以毛泽东方法论进行结构化认知咨询——分析问题、制定战略、组织行动，进入 `person/M`。

## 状态汇报

输出 person 状态时至少包含：

- active change 数量与每个 change 的 `current_phase`
- malformed 目录清单（不符合 `YYYY-MM-DD-<kebab-name>` 格式的目录）
- 每个 change 的当前文档路径、素材路径和最近写入时间
- `phase_history` 最后一项为 `blocked` 或 `updated_at` 超过 14 天未变化的 change
- 推荐下一步入口和原因

## 完成与状态更新

- 所有 person workflow 必须维护同一 change 的 `.status.json`。
- 进入 phase 时更新 `current_phase`，并在 `phase_history` 追加 `in-progress` 记录。
- phase 完成时写入 `completed_at` 和 `status: completed`。
- 用户确认咨询输出或分析边界完成后，才把 `change_status` 置为 `completed`。
