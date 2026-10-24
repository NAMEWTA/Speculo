---
name: specdev
description: "用于需求澄清、规格、任务规划、实现、审查、交付及项目与参考资料学习的工程协作；只读发现不启动 Goal。"
metadata:
  speculo-kind: domain-skill
  speculo-id: domain/specdev
  speculo-domain: specdev
  speculo-contract-version: "2"
---

# specdev

## 发现与激活

只读发现不创建状态、不执行 Work、不取得写入授权。先按 ID/关键词定位相关能力和永久知识条目，再少量回读原文与 provenance。用户指定具体 Work 时直接进入该入口；不需要再次激活本领域。

明确进入本领域后读取 <Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path> 与 <Path>{roots.workflows}/specdev/common/rules/domain-runtime.md</Path>，明确项目/方法/数据根；已有安装验证 workspace，直接使用接受明确根与 Skill 资源，仅读取当前 README/原负责工件与所需分支。普通 Work 不依赖 CLI、初始化或业务 status 镜像。缺少输入、权限、有效 schema 或 owner 冲突时停止受影响分支并保留恢复证据。

## 能力路由

<!-- AUTO-INDEX-START -->

- **specdev/archive-and-consolidate** — 归档与沉淀：<Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/SKILL.md</Path>
- **specdev/code-review** — 代码审查：<Path>{roots.workflows}/specdev/specdev-c-code-review/SKILL.md</Path>
- **specdev/delivery** — 开发交付：<Path>{roots.workflows}/specdev/specdev-d-delivery/SKILL.md</Path>
- **specdev/diagnose-bugs** — 诊断 Bug：<Path>{roots.workflows}/specdev/specdev-d-diagnose-bugs/SKILL.md</Path>
- **specdev/grill-with-docs** — Change 决策访谈：<Path>{roots.workflows}/specdev/specdev-g-grill-with-docs/SKILL.md</Path>
- **specdev/implement** — 实现与验收：<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>
- **specdev/init-setup** — 初始化设置：<Path>{roots.workflows}/specdev/specdev-i-init-setup/SKILL.md</Path>
- **specdev/learn** — 学习与图解：<Path>{roots.workflows}/specdev/specdev-l-learn/SKILL.md</Path>
- **specdev/goal-plan** — Goal 规划与执行：<Path>{roots.workflows}/specdev/specdev-p-goal-plan/SKILL.md</Path>
- **specdev/prototype** — 逻辑与 UI 原型：<Path>{roots.workflows}/specdev/specdev-p-prototype/SKILL.md</Path>
- **specdev/retro** — 整体会话复盘与知识沉淀：<Path>{roots.workflows}/specdev/specdev-r-retro/SKILL.md</Path>
- **specdev/review-architecture** — 架构审查：<Path>{roots.workflows}/specdev/specdev-r-review-architecture/SKILL.md</Path>
- **specdev/spec** — 编写 Spec：<Path>{roots.workflows}/specdev/specdev-s-spec/SKILL.md</Path>
- **specdev/tickets** — 编写计划型 Tickets：<Path>{roots.workflows}/specdev/specdev-t-tickets/SKILL.md</Path>
- **specdev/triage** — 请求评估与分诊：<Path>{roots.workflows}/specdev/specdev-t-triage/SKILL.md</Path>
- **specdev/wayfinder** — 探索大需求与 Change 边界：<Path>{roots.workflows}/specdev/specdev-w-wayfinder/SKILL.md</Path>

<!-- AUTO-INDEX-END -->

## 永久知识

- <Path>{roots.state}/specdev/adr/</Path>
- <Path>{roots.state}/specdev/context/</Path>
- <Path>{roots.state}/specdev/design/</Path>

UI 工作先按 scope/规则 ID 定位设计基线并读取所需 revision；首次基线和归档提升只经 A 的设计知识网关，见 <Path>{roots.workflows}/specdev/common/rules/design-contract.md</Path>。

正式写入前检查原 owner/gateway、未闭合事务及恢复证据。读取索引不自动激活能力，未知网关只阻塞对应写入。

当前工程事实按主题查 <Path>{roots.state}/docs/README.md</Path>（存在时）；它是跨领域 docs 导航，不是本域永久知识 store。
