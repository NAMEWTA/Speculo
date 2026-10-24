---
schema_version: 3
artifact: triage
change: <YYYY-MM-DD-topic>
mode: intake
disposition: needs-triage
verification: pending
remote_actions: []
source: <Path>{roots.state}/specdev/changes/{change}/source.md</Path>
classification: investigation
risk: medium
route: specdev/wayfinder
ready_for_implementation: false
updated_at: <ISO-8601>
---

# Triage: <标题>

## 当前判定

- **影响：** 用户、系统、数据或交付影响
- **紧急度：** immediate / scheduled / normal / unknown
- **当前证据：** 已观察事实，不写推测
- **相关代码/工件：** `<Path>src/example.ts</Path>` / 无

## 未知项

- **可发现事实：** 无 / 需要从仓库、日志、测试或配置查明的事实
- **需要用户决定：** 无 / 会改变目标、范围、行为或风险承受度的决定
- **低影响实现细节：** 无 / 由后续实现者按既有惯例决定

## 路由

- **下一 Work：** `<Path>{roots.workflows}/specdev/specdev-w-wayfinder/SKILL.md</Path>`
- **理由：** 为什么这是最小且正确的下一步

## 实施简报

- **现状与目标：** 当前行为、需要达到的行为；已有实现、重复或拒绝分别说明依据。
- **核验：** 复现输入、环境、命令/退出码、观察结果和可回读证据；PR 固定 base/head SHA，区分已覆盖行为与剩余工作。
- **范围与实现方向：** 涉及的能力、关键接口、依赖、建议步骤和明确不包含的工作。
- **验收：** 可观察的成功/失败条件及验证方法。
- **风险：** 数据、兼容、权限、恢复影响与仍需维护者决定的事项。

ready-for-agent 要求上述内容可执行且 verification=passed；缺失证据不能靠标签补齐。本简报是评估依据，后续正式规格和 Ticket 由其 owner 负责。

## 打标回执

远程标签映射、确切目标、授权、操作与重读结果；无远程动作时写未请求。remote_actions 只引用真实回执，不记录交付状态。完成关闭与发布交 Delivery。
