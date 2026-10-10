---
id: learning/question
type: workflow-entry
workflow: learning
name: 深度探究与苏格拉底问答课
description: tutor 默认约 5 题、作答后讲解；explore 主动发现盲区并深入到处理与验证。无 Change 可创建轻量主题；两种模式不混写，不自动串联 L/H/R。
keywords: [反问, 苏格拉底, socratic, inquiry, 提问课, questioning, 问答课, 主动挖掘, 盲区, 深度探究, explore]
---

# 深度探究与苏格拉底问答课

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/learning/README.md</Path>`。

## 读取范围

读取 `<Path>{roots.workflows}/learning/common/rules/artifact-layouts.md</Path>` 与 `<Path>{roots.workflows}/learning/common/rules/activation-and-memory.md</Path>`，按当前 Change、OBJ、主题和证据 ID 定位最小输入，不默认整读 context/archive。

两种模式均读取 `<Path>{roots.workflows}/learning/common/rules/inquiry-depth-policy.md</Path>` 与 `<Path>{roots.workflows}/learning/common/rules/question-map-contract.md</Path>`。只有工程、Agent 或外部工具主题读取 `<Path>{roots.workflows}/learning/common/rules/production-inquiry.md</Path>`。

<!-- portable:question:start -->
## 模式选择

`mode=tutor|explore` 与 `teaching_method` 是不同维度。显式 mode 优先；恢复时未指定则沿用当前工件模式；新任务要求“考我、让我先答、苏格拉底练习”时使用 tutor，要求“替我主动挖掘、找出未提出的问题、直接深入讲解”时使用 explore；其余默认 tutor。既希望深挖又希望自己回答时仍可用 tutor 加强内容深度，不必强制切换模式。

tutor 保持先作答后讲解，一批默认 5 题，用户指定正整数 n 则生成 n 对连续 Q/A，不能截断或套用其他模式上限。explore 直接发现、解释和推演，不伪造学习者答案、提交状态或理解表现。两种方式都要解释重要发现的原因，并推进主要分支到证据与验证。

已有未提交问答批次时要求直接探索，另建探索记录并关联原问题，保留原始批次及提交状态；不能替学习者填 A、自动提交或原地改成自问自答。恢复请求没有提供可定位的权威工件时，先找本主题实际记录，不能虚构上次进度。
<!-- portable:question:end -->

## 共同启动

1. 解析 roots 与 Learning v2 状态、stable Change ID、当前 locator 和根锁。缺少 status.json/locations.json 时按 I-init-setup 初始化空骨架；未知 schema、v1、锁冲突、越界或 parent cycle 按激活合同阻塞。任何状态写入仍须满足入口授权。
2. 没有可用 Change 时，按用户主题创建 lightweight inquiry Change `YYYY-MM-DD-<kebab-topic>`：INDEX.md、最小 course.md/baseline.md/sources.md、inquiry/INDEX.md、learning-log.md 和 .status.json（phase=teaching，current_work=learning/question）。不假装完成完整课程设计。轻量模板读取 `<Path>{roots.workflows}/learning/Q-question/lightweight-course-template.md</Path>`。
3. 已有 Change 时只取对应 course/OBJ/Lesson/baseline/notes 和 inquiry 索引相关项；问题地图首次使用才创建，不回填旧历史。恢复已关闭记录只读，后续建立新批次或探索。
4. 按上方规则选模式并只加载对应分支。`mode=tutor` 读取 `<Path>{roots.workflows}/learning/Q-question/references/tutor-mode.md</Path>`；`mode=explore` 读取 `<Path>{roots.workflows}/learning/Q-question/references/exploration-mode.md</Path>`。不要同时执行两个分支。

## 工件与完成边界

- tutor 使用 inquiry/IQ-*.md：Response: pending → ready → closed，冻结原 Q/A 后追加 Teaching 与 Inquiry Lesson；完整协议及 validate-inquiry 命令在 tutor 分支。
- explore 使用 inquiry/explorations/EX-*.md 与 inquiry/question-map.json；独立结构验证，不送入 IQ 的提交状态机。
- Q 只拥有当前 Change 的 inquiry/ 及已授权的索引、日志、状态更新；不写 lessons/、homework/、goal/、mastery 或永久 context，不自动激活 L/H/R/G。
- 问题地图的 resolved 不表示 mastered；只有真实延迟复习证据才能由原 owner 更新 retention。结构验证不认证教学质量。
- 先验证工件与引用、发布工件，再更新索引/日志和 Change 状态。失败保留候选与恢复证据，不提前清空 blocker 或推进完成。

## 网页适配

仅编译独立网页能力时读取 `<Path>{roots.workflows}/learning/common/rules/portable-learning-runtime.md</Path>`；工作区执行不加载该适配，不改变原 Response 精确行协议。
