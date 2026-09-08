---
name: specdev-plan-quality-review
description: T 发布计划型 Ticket 或 P 发布/重规划 Goal 前检查决策完备、Skill 调用和执行门禁；不执行代码审查或代替用户批准。
---

# Plan Quality Review

读取 `<Path>{roots.workflows}/specdev/common/skills/plan-quality-review/references/checklist.md</Path>`，输入当前范围的 Spec、Ticket、map、授权引用和真实技能元数据。只读检查，结果交回 T/P 写入其原有 LOG/Evidence，不创建独立状态根。

按背景与边界、调用可执行性、依赖/资源、验收与数量、权限与恢复逐项给出 pass/block/not-applicable 及证据。任一硬门禁缺失则阻塞受影响票；用户要求完整计划时不得用 Lite、少量样例或压缩输出代替全部交付。
