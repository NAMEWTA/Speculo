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

1. 先读取 `<Path>{roots.workflows}/learning/README.md</Path>` 与当前 Work 的状态入口。
2. 再读取 `<Path>{roots.workflows}/learning/common/rules/activation-and-memory.md</Path>`，按当前分支、状态和关键词定位最小相关工件。
3. 只在本 Work 明确要求恢复、冲突、执行安全、创建 Change 或归档证据时扩展为全量读取；缺少匹配证据或 owner/gateway 时停止受影响分支。

## 流程

1. 解析 roots 与 Learning v2 状态。若尚无 `status.json` / `locations.json`，先按 I-init-setup 写入空状态骨架，不创建知识条目。
2. 若没有可用 Change：根据用户主题创建 lightweight inquiry Change `YYYY-MM-DD-<kebab-topic>`，写入 `INDEX.md`、最小 `course.md`/`baseline.md`/`sources.md`、`inquiry/INDEX.md`、`learning-log.md` 和 `.status.json`（`phase=teaching`，`current_work=learning/question`）。不假装已完成 A-assess-and-plan 的完整课程地图。
3. 若已有 Change：按 Activation 合同只读取对应 course/OBJ/Lesson/baseline/notes/inquiry 索引；不整读 archive 或其他 Change。
4. 读取 `<Path>{roots.workflows}/learning/common/skills/socratic-questioning/SKILL.md</Path>` 与 `<Path>{roots.workflows}/learning/common/rules/questioning-policy.md</Path>`。按用户指定教法或默认 `socratic` 配方生成一批约 5 题。
5. 创建 `inquiry/IQ-<NNN>-<slug>-batch-NN.md`：元数据、Q1…Q5、空白 A1…A5、`Response: pending`。更新 `inquiry/INDEX.md`。不得把答案写入题目。
6. 学习者填写 A1…并写入精确行 `Response: ready` 后再次激活本 Work。校验回答原文与标记，冻结 Q/A。
7. 只在同一文件末尾追加 `## Teaching` 与 `## Inquiry Lesson`。Teaching 逐题给出思路复原、`aligned|partial|off|uncertain`、中文详解、`Explain (English)`、纠错路径、先前未覆盖知识和来源锚点。Inquiry Lesson 把本批 5 题收成一节短课单元，并以 keep-alive 钩子指向下一批、缺失 OBJ、L、H 或 R。将 `Response:` 更新为 `closed`。
8. 更新 `learning-log.md` 与 Change `.status.json`：`works_run` 追加 `learning/question`，清空 `current_work`。不写 mastered，不写入 `lessons/` 或 `homework/`，不自动激活其他 Work。重答必须新建 batch 文件并链接旧文件。

## 完成标准

- 一批默认 5 题；数量可由用户指定，但必须 Q/A 成对且连续编号；
- `Response: pending|ready|closed` 状态可审计；ready 之前不得出现 Teaching / Inquiry Lesson；
- Teaching 是授课讲解，不是 H 的评分 Review，不得使用 `Submission` 或 `verdict: correct|partial|incorrect` 字段名；
- 5 题生成一节 Inquiry Lesson；完整 30–40 分钟讲义仍归 L-lesson；
- 无 Change 时本 Work 可自行创建 lightweight inquiry Change，不得因缺少 A 产物而拒绝开问；
- 真新手或高元素交互时必须提供降级探针或建议先走 L-lesson。

## 子文件

- 问答课模板：`<Path>{roots.workflows}/learning/Q-question/inquiry-template.md</Path>`
- 轻量课程模板：`<Path>{roots.workflows}/learning/Q-question/lightweight-course-template.md</Path>`
- 提问政策：`<Path>{roots.workflows}/learning/common/rules/questioning-policy.md</Path>`
- 提问引擎：`<Path>{roots.workflows}/learning/common/skills/socratic-questioning/SKILL.md</Path>`
