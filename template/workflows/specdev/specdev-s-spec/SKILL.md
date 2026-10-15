---
name: specdev-s-spec
description: "综合已知事实、设计决定、诊断与代码现状，产出以外部行为和验收合同为权威的 Ready Spec。"
metadata:
  speculo-kind: work-skill
  speculo-id: specdev/spec
  speculo-domain: specdev
  speculo-contract-version: "2"
---

# 编写 Spec

激活后读取 `<Path>{roots.workflows}/specdev/common/rules/domain-runtime.md</Path>` 与 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`。本 Work 综合已有事实，定义为什么、为谁、系统应表现为何，不另开宽泛访谈，也不写逐文件施工计划。

## 形成行为合同

1. **Grounding**：定位用户目标与当前代码、测试、接口、schema、配置和运行事实。按存在情况定位 change 的来源、分诊、诊断、LOG、CONTEXT、ADR 及相关永久领域词汇/决策；只回读命中原文，可选工件缺失静默跳过，不当作已确认事实。按 `<Path>{roots.workflows}/specdev/common/rules/planning-principles.md</Path>` 区分可发现事实、高影响偏好和可逆实现细节；冲突按 `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>` 返回权威 owner。
2. **关闭必要决定**：只确认会改变外部行为、接口、数据、兼容、安全、迁移、发布或验收的高价值问题。广泛取舍未定时返回 `<Path>{roots.workflows}/specdev/specdev-g-grill-with-docs/SKILL.md</Path>`；陌生外部依赖或版本行为通过 `<Path>{roots.workflows}/specdev/common/skills/research/SKILL.md</Path>` 查证。不虚构错误码、性能阈值、法规或迁移政策。
3. **写入合同**：先按下述轻量/完整边界选择唯一负责位置；轻量写 README 等价章节，完整模式以 `<Path>{roots.workflows}/specdev/specdev-s-spec/assets/spec-template.md</Path>` 写入 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`。必需正文为问题与目标、外部行为、验收合同、范围和验证策略；用户故事、接口数据、NFR、约束与风险按需展开。已使用的 `US-### / AC-### / NFR-### / DEC-### / OOS-###` 保持稳定，不为凑数量生成条目。实现约束仅锁定会影响公共合同、兼容、安全或验收的决定。
4. **绑定验证接缝**：优先复用稳定接缝，通常从用户端到端行为、公共 API/CLI、事件/集成、稳定单元接缝选择；按实际风险与项目先例决定，不机械追求最高测试层级。每个接缝注明入口类型/位置、触发方式、可观察结果、覆盖 AC 和实际测试先例/命令。选择显著改变可测试性、事故半径或范围时聚焦确认；可由已有代码推导时记录依据即可。证据遵守 `<Path>{roots.workflows}/specdev/common/rules/evidence-and-verification.md</Path>`。
5. **Readiness**：对照 <Path>{roots.workflows}/specdev/specdev-s-spec/references/spec-readiness.md</Path>；完整 Spec 再校验 <Path>{roots.workflows}/specdev/common/schemas/spec.schema.json</Path>。高影响未决问题使 `ready_for_tickets: false`；低影响、可逆默认值可作为带验证方式的显式假设。每个 AC 必须可观察、可判定、绑定接缝；只展开实际适用影响；已识别风险若不采取检查，说明依据。

简单单 change 可使用 README 的 scope/acceptance/verification 等价章节承载规格，仍须通过同一行为/AC/Ready 语义；独立 <Path>{roots.state}/specdev/changes/{change}/spec.md</Path> 存在时默认使用它，双权威先裁决。用户明确要求 Spec 或存在复杂设计/Deep/并行/跨 change 时交付完整 Spec。迁出 README 规格改为导航。

## 失败与兼容合同

适用时读取 <Path>{roots.workflows}/specdev/common/rules/error-handling.md</Path>，把未开始/部分发生/已提交/未知结果、重复/乱序/取消、可重试前提、状态有效性和可见诊断写入原 AC/NFR。公共接口与旧数据变更须给出兼容、迁移和恢复限制。每项绑定真实可观察接缝或待建设接缝，不虚构错误码、性能阈值或安全保证。已知低风险变更不为了填表增加无关条款。

## 验证、状态与交接

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --stage spec --repo <project-root> <Path>{roots.state}/specdev/changes/{change}</Path>
```

回读真实规格与 Ready 结论，返回负责工件完整路径、行为/验收合同、范围、验证接缝、风险、高影响缺口与验证结果；接续写原 README/规格，不维护调用或全局状态镜像。

完整 Spec 就绪且已有同范围实现授权时，可直接进入 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>，执行方式与 current/worktree 独立确定；未指定时按当前宿主正常执行，明确指定 CLI 交互、Herdr 等方式时按选择执行。需要独立调度、依赖图、逐票追踪或用户要求拆票时进入 <Path>{roots.workflows}/specdev/specdev-t-tickets/SKILL.md</Path>；需要跨任务/跨 change 总控才进入 P。产出 Ready Spec 本身不授权实施，只有规格请求时返回可用路由。

## UI 设计与逻辑原型

涉及 UI 外部行为时读取 <Path>{roots.workflows}/specdev/common/rules/design-contract.md</Path>，硬引用已批准 <Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path> 的 revision/digest、项目基线和指定 UI 原型；把页面/状态/交互映射到 Spec AC。未确认、摘要漂移或与行为合同冲突时 UI 部分不可 Ready，返回 P 或相应 owner；不在 S 重新选风格。纯后端不强制设计文档。

LOGIC 原型仍可作为已验证行为和边界证据，记录具体 locator/hash；它不自动成为生产实现，也不要求 UI DESIGN。未闭合高影响产品决定返回 G。
