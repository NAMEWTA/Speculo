---
name: learning-l-lesson
description: "一次输出 30–40 分钟、通俗但完整的 Lesson；不生成作业、不评分、不宣称掌握。"
metadata:
  speculo-kind: work-skill
  speculo-id: learning/lesson
  speculo-domain: learning
  speculo-contract-version: "2"
---

# 完整课程讲解

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/learning/common/rules/domain-runtime.md</Path>`。

## 读取范围

授课前读取 `<Path>{roots.workflows}/learning/common/rules/lesson-contract.md</Path>` 与 `<Path>{roots.workflows}/learning/common/rules/teaching-policy.md</Path>`，核对课程合同与教学表达。

读取 `<Path>{roots.workflows}/learning/common/rules/activation-and-memory.md</Path>`，按当前 Change、OBJ、主题与证据 ID 定位本轮输入；仅当前恢复或安全门要求时扩读。

读取 `<Path>{roots.workflows}/learning/common/rules/inquiry-depth-policy.md</Path>`；只有工程、Agent 或外部工具主题读取 `<Path>{roots.workflows}/learning/common/rules/production-inquiry.md</Path>`。

## 流程

读取 `<Path>{roots.workflows}/learning/common/rules/evidence-integrity.md</Path>`，校验当前 Work 的声明、引用及证据时间；不改变原方法或获取其他 Work 的写权限。

1. 确认 Change 有 `course.md`、`background/foundation.md`、`baseline.md`、目标 OBJ 和 `sources.md`；缺失时返回 A-assess-and-plan。
2. 用户指定 Lesson 主题、OBJ、期望效果和深度；读取精确背景和来源，不遍历无关 context。
3. 按课程合同和 Lesson 模板生成一个 `lessons/L-<NNN>-<slug>.md`；`delivered_at` 记录实际交付时间，`estimated_minutes` 为 30–40，`time_budget` 各段为正数且合计等于 estimated_minutes。
4. 逐个核对核心目标的合同覆盖，按主题安排章节，不套用固定 5E 或单一路线；盲区分析与现实检验用讲解案例呈现，保持活动预算。
5. 保持教学与作业分离。更新 `lessons/INDEX.md` 与 `learning-log.md`，运行 validator，清空 current_work。

## 完成标准

- Lesson 的活动预算合计 30–40 分钟，内容覆盖矩阵完整，不能用字符数替代时间估计；
- ELI5 只降低表达门槛，不删去深度、边界、证据或不确定性；
- 外链图片有 alt/caption/source/访问日期和完整文字替代，链接失效不影响理解；
- 教学和作业严格分离，用户可稍后主动激活 H。

## 子文件

- Lesson 模板：`<Path>{roots.workflows}/learning/learning-l-lesson/assets/lesson-template.md</Path>`

仅编译独立网页课程时读取 `<Path>{roots.workflows}/learning/common/rules/portable-learning-runtime.md</Path>`；本地仍保留 A 产物前置条件，不加载网页适配。
