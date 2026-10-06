---
id: learning/question
type: workflow-entry
workflow: learning
name: 苏格拉底问答课
description: 以一批约 5 题激活已知与未知，学习者作答后追加详细讲解、纠错与深化；一批生成一节 inquiry-lesson。无 Change 时可自行创建 lightweight inquiry Change。不自动串联 L/H/R。
keywords: [反问, 苏格拉底, socratic, inquiry, 提问课, questioning, 激活, 问答课]
---

# 苏格拉底问答课

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/learning/README.md</Path>`。

## 读取范围

当前步骤开始前，读取 `<Path>{roots.workflows}/learning/common/rules/artifact-layouts.md</Path>`；只加载本 Work 需要的领域合同。

读取 `<Path>{roots.workflows}/learning/common/rules/activation-and-memory.md</Path>`，按当前 Change、OBJ、主题与证据 ID 定位本轮输入；仅当前恢复或安全门要求时扩读。

## 流程

1. 解析 roots 与 Learning v2 状态。若尚无 `status.json` / `locations.json`，先按 I-init-setup 写入空状态骨架，不创建知识条目。
2. 若没有可用 Change：根据用户主题创建 lightweight inquiry Change `YYYY-MM-DD-<kebab-topic>`，写入 `INDEX.md`、最小 `course.md`/`baseline.md`/`sources.md`、`inquiry/INDEX.md`、`learning-log.md` 和 `.status.json`（`phase=teaching`，`current_work=learning/question`）。不假装已完成 A-assess-and-plan 的完整课程地图。
3. 若已有 Change：按 Activation 合同只读取对应 course/OBJ/Lesson/baseline/notes/inquiry 索引；不整读 archive 或其他 Change。
4. 读取 `<Path>{roots.workflows}/learning/common/skills/socratic-questioning/SKILL.md</Path>` 与 `<Path>{roots.workflows}/learning/common/rules/questioning-policy.md</Path>`。按用户指定教法或默认 `socratic` 配方生成本批 n 题：用户指定正整数时使用该值，否则默认 5；不套用 G-goal 的 mine 十问上限。
5. 创建 `inquiry/IQ-<NNN>-<slug>-batch-NN.md`：元数据（question_count=n）、Q1…Qn、空白 A1…An、`Response: pending`。更新 `inquiry/INDEX.md`。不得把答案写入题目。
6. 学习者填写 A1…并写入精确行 `Response: ready` 后再次激活本 Work。校验回答原文与标记，冻结 Q/A。
7. 只在同一文件末尾追加 `## Teaching` 与 `## Inquiry Lesson`。Teaching 逐题给出思路复原、`aligned|partial|off|uncertain`、中文详解、`Explain (English)`、纠错路径、先前未覆盖知识和来源锚点。Inquiry Lesson 把本批 n 题收成一节短课单元，并以 keep-alive 钩子指向下一批、缺失 OBJ、L、H 或 R。将 `Response:` 更新为 `closed`。
8. 更新 `learning-log.md` 与 Change `.status.json`：`works_run` 追加 `learning/question`，清空 `current_work`。不写 mastered，不写入 `lessons/` 或 `homework/`，不自动激活其他 Work。重答必须新建 batch 文件并链接旧文件。

## 当前批次验证

生成新批次后，以实际用户数量 n（未指定则 5）运行：

```bash
node <Path>{roots.workflows}/learning/Q-question/tools/validate-inquiry.mjs</Path> --change-dir <Path>{roots.state}/learning/changes/{change}</Path> --file <当前批次相对路径> --expected-count <n>
```

关闭前先在当前 change 内保留用户已提交的 `Response: ready` 原文快照，用候选 closed 文件和 `--before <ready快照相对路径>` 校验 Q/A 与元数据字节不变，再发布候选。快照作为当前批次证据，不新建状态树；归档或合并中的 change 通过稳定 ID 解析当前 locator，不把示例 changes 路径当永久位置。失败不更新 Response 或状态。工具只检查结构与所提供的原文字节，不认证回答作者或授课质量；旧历史不会被全局重写或自动迁移。

## 完成标准

- 一批默认 5 题；数量可由用户指定，但必须 Q/A 成对且连续编号；
- `Response: pending|ready|closed` 状态可审计；ready 之前不得出现 Teaching / Inquiry Lesson；
- Teaching 是授课讲解，不是 H 的评分 Review，不得使用 `Submission` 或 `verdict: correct|partial|incorrect` 字段名；
- 本批全部题目生成一节 Inquiry Lesson；完整 30–40 分钟讲义仍归 L-lesson；
- 无 Change 时本 Work 可自行创建 lightweight inquiry Change，不得因缺少 A 产物而拒绝开问；
- 真新手或高元素交互时必须提供降级探针或建议先走 L-lesson。

## 子文件

- 问答课模板：`<Path>{roots.workflows}/learning/Q-question/inquiry-template.md</Path>`
- 轻量课程模板：`<Path>{roots.workflows}/learning/Q-question/lightweight-course-template.md</Path>`
- 提问政策：`<Path>{roots.workflows}/learning/common/rules/questioning-policy.md</Path>`
- 提问引擎：`<Path>{roots.workflows}/learning/common/skills/socratic-questioning/SKILL.md</Path>`
