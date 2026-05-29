---
id: doc/readme
category: doc
name: README 工作流
description: 项目 README 撰写与维护
keywords: [readme, 文档, 项目说明]
---

# README 工作流执行指引

本工作流把项目事实转化为面向使用者的 README：一句话定位、快速开始、能力清单、文档入口与 License 状态。它不负责虚构安装方式或营销文案，只整理项目已经存在或用户明确提供的信息。

AI 进入本工作流时的前置动作：

1. 读目标项目现有 README（若存在）与 `../../../.speculo/.config/{ARCHITECTURE.md,STRUCTURE.md,CONVENTIONS.md}`（若存在）。
2. 扫描项目根常见清单文件（如 package/pyproject/go.mod/Cargo.toml）确认技术栈与启动命令。
3. 若关键信息缺失，在 README 产物中显式写"未指定"，不要猜测。

## 阶段

### 1. Structure — 章节结构与撰写
- 规范：`readme-structure.md`
- 模板：`../_templates/readme-template.md`
- 产物：`readme.md`
- 完成准则：
  - `readme.md` 无残留 `[TODO:]`
  - 快速开始命令来自项目事实或用户明确输入
  - 所有相对链接指向存在的文件或明确标注"待创建"

## 依赖

- 软依赖：无
- 硬依赖：无

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `readme_target` (string) — 目标 README 路径，默认 `README.md`
- `quickstart_verified` (boolean) — 快速开始命令是否已实际验证
- `missing_facts` (array) — 仍需用户确认的信息清单
- `readme_sections` (array) — 已完成章节名

## 完成与状态更新

- 进入 Structure 时：`current_phase` 置 `structure`；`phase_history` 追加 `{phase: "structure", entered_at, status: "in-progress"}`。
- Structure 完成：把对应条目置 `completed`；写入 `readme_sections`、`quickstart_verified`、`missing_facts`。
- 若 `missing_facts` 为空且用户确认可发布：`change_status` 可置 `completed`；否则保持 `active` 并说明待确认项。
