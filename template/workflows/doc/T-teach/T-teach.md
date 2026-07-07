---
id: doc/teach
category: doc
name: Teaching Design
description: 设计交互式学习体验：确立使命、策展资源、构建术语、制作课程、记录洞察
keywords: [teach, lesson, learning, glossary, 教学, 课程, 术语, 学习]
---

# Teaching Design 工作流执行指引

本工作流是 `doc/T` 入口：围绕学习主题设计交互式教学体验（使命→资源→课程→参考→记录）。

> **产物目录：** `speculo/.speculo/doc/<change>/`。`<change>` 必须为 `YYYY-MM-DD-<kebab-name>`。

## 核心理念

深度学习需要 Knowledge（高质量资源）、Skills（交互式课程）与 Wisdom（实践互动）。留存设计原则：retrieval practice、spacing、interleaving。每节课短小、给一个具体胜利，控制在学习者工作记忆容量内。

Lesson 铁律与 HTML 课程结构见 `teach-lesson.md` 与 `../_templates/teach-lesson-html-template.md`。

## 阶段

| Phase | id | 规范 | 模板 | 产物 |
|-------|-----|------|------|------|
| 1. Mission Setup | `mission-setup` | `teach-mission.md` | `../_templates/teach-mission-template.md` | `mission.md` |
| 2. Resources Curation | `resources-curation` | `teach-resources.md` | `../_templates/teach-resources-template.md` | `resources.md` |
| 3. Lesson Design | `lesson-design` | `teach-lesson.md` | `../_templates/teach-lesson-html-template.md` | `lessons/<编号>.html` |
| 4. Lesson Wrap | `lesson-wrap` | `teach-lesson-wrap.md` | glossary + learning-record 模板 | `reference/<编号>.html` 等 |

Phase 3 ↔ 4 为紧密循环：每节课程完成后立即收尾。`current_loop` 映射：`mission-setup` | `resources-curation` | `lesson-design` | `lesson-wrap`。

### 1. Mission Setup — 确立学习使命
- id：`mission-setup`
- 完成准则：`mission.md` 无残留 `[TODO:]`；成功标准可观测

### 2. Resources Curation — 策展可信资源
- id：`resources-curation`
- 完成准则：`resources.md` 无残留 `[TODO:]`；至少一条高信任度资源

### 3. Lesson Design — 设计一节交互式课程
- id：`lesson-design`
- 完成准则：课程关联 `mission.md`；编号递增

### 4. Lesson Wrap — 课程收尾
- id：`lesson-wrap`
- 完成准则：参考文档与 GLOSSARY 已更新

## 依赖

- 硬依赖：Phase 1 → Phase 2
- 软依赖：Phase 2 → Phase 3

## 状态扩展字段

- `doc_entry` (string) — 固定为 `doc/T`
- `mission_status` (drafting | confirmed)
- `resource_count`、`lesson_count`、`reference_count`、`learning_record_count`、`glossary_term_count` (number)
- `current_loop` (mission-setup | resources-curation | lesson-design | lesson-wrap)

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- Phase 3-4 循环时更新 `lesson_count` 等计数。
- 用户声明学习目标全部达成后，调用 `../../commands/archive.md` 归档 change；不得自行写入 `change_status: completed`。
