---
id: doc/teach
category: doc
name: Teaching Design
description: 设计交互式学习体验：确立使命、策展资源、构建术语、制作课程、记录洞察
keywords: [teach, lesson, learning, glossary, 教学, 课程, 术语, 学习]
---

# Teaching Design 工作流执行指引

本工作流用于在项目内围绕一个学习主题，设计并交付交互式教学体验。它是 `doc/T` 入口，覆盖从使命确立到课程产出、参考文档和洞察记录的完整链路。

## 内置指引

### 核心理念

深度学习需要三样东西：

- **Knowledge（知识）** — 从高质量、高信任度资源获取
- **Skills（技能）** — 通过你设计的高度相关交互式课程获得
- **Wisdom（智慧）** — 来自与其他学习者和实践者的互动

获取知识时，难度是敌人——它会吃掉理解所需的工作记忆。练习技能时，难度是工具——有努力的提取才能建立长期留存。

### 留存设计原则

- **Retrieval practice**：让用户从记忆中回忆，而非重新阅读
- **Spacing**：把练习分散到多节课，不要集中轰炸
- **Interleaving**：在技能练习中混合不同但相关的主题

每节课应该短小精悍，在很短时间内可完成。学习者工作记忆很有限，必须控制在容量内。但每节课应该给用户一个具体的小胜利。

### 最近发展区

每节课用户都应该感觉被挑战得「刚好够」。判断最近发展区的方法：

1. 读取 `learning-records/`，了解用户已知什么
2. 基于使命判断下一个该教什么
3. 教能放进最近发展区的最相关内容

### Lesson 铁律

一节 lesson 是自包含的单个 HTML 文件，保存为 `speculo/.speculo/doc/<change>/lessons/<编号>.html`。它必须：

- **漂亮** — 干净、可读的排版和布局，用户以后会回来复习
- **短** — 在几分钟内可完成
- **给一个胜利** — 每节课一个具体可感知的收获
- **直接关联使命** — 每节课都追溯回 MISSION.md
- **链向其他资源** — 通过 HTML 锚点链向其他课程和参考文档
- **推荐一手资料** — 每节课推荐一个最高质量、最高信任度的外部资源
- **提示提问** — 每节课包含提醒用户向 AI 教师追问

### 课程结构模板

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>课程标题</title>
<style>
  body { max-width: 680px; margin: 2rem auto; padding: 0 1rem; font-family: system-ui; line-height: 1.7; color: #1a1a1a; }
  h1 { font-size: 1.6rem; margin-top: 2.5rem; }
  blockquote { border-left: 3px solid #ddd; margin-left: 0; padding-left: 1rem; color: #555; }
  .cite { font-size: 0.85rem; color: #888; margin-top: 2rem; border-top: 1px solid #eee; padding-top: 0.5rem; }
  .reminder { background: #f5f5f5; padding: 0.8rem 1rem; border-radius: 6px; margin-top: 2rem; font-size: 0.9rem; }
</style>
</head>
<body>
<!-- 课程内容 -->
<div class="cite">📖 推荐一手资料：<a href="...">资源标题</a></div>
<div class="reminder">💡 有疑问？直接问我——我是你的 AI 教师。</div>
</body>
</html>
```

## 阶段

> **产物目录：** 本工作流所有产物写入 `speculo/.speculo/doc/<change>/`。下文产物路径均相对该 change 目录。**`<change>` 必须为 `YYYY-MM-DD-<kebab-name>`**（例：`2026-06-12-teach-react-basics`）。

### 1. Mission Setup — 确立学习使命
- 规范：`teach-mission.md`
- 模板：`../_templates/teach-mission-template.md`
- 产物：`mission.md`
- 完成准则：
  - 已追问出具体、可观测的成功标准（非「想了解 X」而是「能做 Y」）
  - Why / Success / Constraints / Out of scope 四段均已填写
  - `mission.md` 无残留 `[TODO:]`

### 2. Resources Curation — 策展可信资源
- 规范：`teach-resources.md`
- 模板：`../_templates/teach-resources-template.md`
- 产物：`resources.md`
- 完成准则：
  - 已搜集高信任度知识源（优先一手资料、公认专家、同行评审）
  - 每条资源有注解：覆盖什么、何时取用
  - 已找到至少一个可推荐社区（除非用户选择不加入社区）
  - `resources.md` 无残留 `[TODO:]`

### 3. Lesson Design — 设计一节交互式课程（主循环）
- 规范：`teach-lesson.md`
- 模板：无（HTML 课程见内置指引的课程结构模板）
- 产物：`lessons/<编号>.html`
- 完成准则：
  - 课程短小（几分钟内可完成）、有一个具体胜利、直接关联使命
  - 课程已链向相关参考文档和其他课程
  - 课程包含一手资料推荐和 AI 追问提示
  - 编号从已有最高编号 +1

### 4. Lesson Wrap — 课程收尾
- 规范：`teach-lesson-wrap.md`
- 模板：`../_templates/teach-glossary-template.md`、`../_templates/teach-learning-record-template.md`
- 产物：`reference/<编号>.html`、`GLOSSARY.md`（持续更新）、`learning-records/<编号>.md`（可选）
- 完成准则：
  - 已为该课程创建压缩参考文档（cheat sheet / 速查）
  - 用户在本课中真正理解的术语已收录进 GLOSSARY.md
  - 若产生非显而易见的洞察，已写 learning record
  - 已更新 `NOTES.md`（若用户表达了教学偏好）

## 依赖

- 硬依赖：Phase 1 → Phase 2，使命未确立前不得策展资源
- 软依赖：Phase 2 → Phase 3，建议先有资源再设计课程
- Phase 3 ↔ Phase 4 为紧密循环：每节课程完成后立即收尾

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `doc_entry` (string) — 固定为 `doc/T`
- `mission_status` (drafting | confirmed) — 使命确认状态
- `resource_count` (number) — 已策展资源数量
- `lesson_count` (number) — 已创建课程数量
- `reference_count` (number) — 已创建参考文档数量
- `learning_record_count` (number) — 已写学习记录数量
- `glossary_term_count` (number) — 术语表条目数
- `current_loop` (mission | resources | lesson | wrap) — 当前循环位置

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- Phase 1 完成且用户确认使命后，`mission_status` 置为 `confirmed`。
- Phase 3-4 为循环：每次完成一节课程和收尾后，更新 `lesson_count`、`reference_count`、`glossary_term_count`。
- 每次捕捉到学习洞察时追加 `learning_record_count`。
- 用户声明学习目标全部达成后，可把 `change_status` 置为 `completed`。
- 如有可沉淀教学经验，在用户允许时追加到 `speculo/.speculo/.config/LESSONS.md`。
- NOTES.md 作为教学偏好暂存区，AI 在后续课程设计中应参考其中记录。
