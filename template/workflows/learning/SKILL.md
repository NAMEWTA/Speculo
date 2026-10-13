---
name: learning
description: "用于学习目标、课程、练习、复习及知识巩固；不将发现能力视为开始学习流程。"
metadata:
  speculo-kind: domain-skill
  speculo-id: domain/learning
  speculo-domain: learning
  speculo-contract-version: "2"
---

# learning

## 发现与激活

只读发现不创建状态、不执行 Work、不取得写入授权。先按 ID/关键词定位相关能力和永久知识条目，再少量回读原文与 provenance。用户指定具体 Work 时直接进入该入口；不需要再次激活本领域。

明确进入本领域后读取 <Path>{roots.workflows}/learning/common/rules/activation-and-memory.md</Path> 与 <Path>{roots.workflows}/learning/common/rules/domain-runtime.md</Path>，解析 workspace，仅读取当前任务需要的状态、入口与分支参考。缺少输入、权限、有效 schema 或 owner 冲突时停止受影响分支并保留恢复证据。

## 能力路由

<!-- AUTO-INDEX-START -->

- **learning/archive** — 冷归档：<Path>{roots.workflows}/learning/learning-a-archive/SKILL.md</Path>
- **learning/assess-and-plan** — 评估背景并设计课程：<Path>{roots.workflows}/learning/learning-a-assess-and-plan/SKILL.md</Path>
- **learning/consolidate** — 主题整合：<Path>{roots.workflows}/learning/learning-c-consolidate/SKILL.md</Path>
- **learning/goal** — 目标学习（目标模式）：<Path>{roots.workflows}/learning/learning-g-goal/SKILL.md</Path>
- **learning/homework** — 课程作业与评审：<Path>{roots.workflows}/learning/learning-h-homework/SKILL.md</Path>
- **learning/init-setup** — 初始化学习系统：<Path>{roots.workflows}/learning/learning-i-init-setup/SKILL.md</Path>
- **learning/lesson** — 完整课程讲解：<Path>{roots.workflows}/learning/learning-l-lesson/SKILL.md</Path>
- **learning/question** — 深度探究与苏格拉底问答课：<Path>{roots.workflows}/learning/learning-q-question/SKILL.md</Path>
- **learning/review** — 延迟保持与周期复习：<Path>{roots.workflows}/learning/learning-r-review/SKILL.md</Path>

<!-- AUTO-INDEX-END -->

## 永久知识

- <Path>{roots.state}/learning/context/INDEX.md</Path>
- <Path>{roots.state}/learning/context/REVIEW.md</Path>

正式写入前检查原 owner/gateway、未闭合事务及恢复证据。读取索引不自动激活能力，未知网关只阻塞对应写入。
