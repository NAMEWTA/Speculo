---
id: learning/eli5
type: workflow-entry
workflow: learning
name: 通俗图解教学
description: 根据已验证背景、明确教学表达基线和锁定目标，用 ASCII 图、短句、类比边界与递减脚手架形成可恢复课程。
keywords: [eli5, 通俗教学, ASCII, lesson, 图解]
---

# 通俗图解教学

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/learning/README.md</Path>`，再执行本入口。

本 Work 负责把锁定目标讲成 Learning change 内可练习、可恢复的课程。它只教学，不评分、不宣称 mastered、不修改永久知识。

## 流程

1. 恢复唯一 change；若缺少 `learning-plan.md` 或 baseline，路由 A-assess，不自行补造。设置 `current_work=learning/eli5`。
2. 读取目标 OBJ、sources、baseline、明确写出的教学表达基线，以及 context 索引精确指向的已掌握知识。教学表达基线必须使用“5 岁的小孩”“大一新生”等直接标签，不得改写成含糊的“初学者”；只把经证据确认的概念作为桥梁。
3. 按 `<Path>{roots.workflows}/learning/common/rules/teaching-policy.md</Path>` 和 lesson 模板选择最小下一课。编号从 `lessons/` 现有最大 `NN-` 加一，不覆盖旧课。
4. 先给纯文本 ASCII 全图，再按箭头解释。说明它是什么、为什么需要、如何运作；术语先日常说法后专业名称，类比写清失效边界。不得生成 Mermaid、HTML、SVG 或依赖专用渲染器的图。
5. 使用“示范一个、共同完成一个、留一个独立练习”的脚手架；答案留给 P，不在 lesson 中泄露独立练习完整解答。
6. 更新 `learning-log.md`，记录覆盖的 OBJ、使用的已掌握背景、仍存在的困惑和下一练习，不把对话流水账写入 context。
7. validator 通过后设置 phase=`teaching`，去重完成 Work，路由 P-practice。事实或来源冲突时阻塞并返回 A-assess。

## 完成标准

- 新 lesson 对应明确 OBJ，旧课程未覆盖；
- 至少一个有方向的 ASCII 图，且纯 Markdown；
- 教学表达基线使用“5 岁的小孩”“大一新生”等明确标签，并落实到句子、术语和示例难度；
- 教学难度利用真实背景，但表达保持通俗；
- 课程包含类比边界和独立练习，不包含 mastered 声明；
- 状态、日志和下一路由一致。

## 子文件引用

- Lesson 模板：`<Path>{roots.workflows}/learning/E-eli5/lesson-template.md</Path>`
