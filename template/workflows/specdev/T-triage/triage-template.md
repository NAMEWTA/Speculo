---
schema_version: 1
artifact: triage
change: <YYYY-MM-DD-topic>
mode: intake
source: <Path>{roots.state}/specdev/changes/{change}/source.md</Path>
classification: investigation
risk: medium
route: specdev/wayfinder
ready_for_implementation: false
external_action: not-applicable
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

- **下一 Work：** `<Path>{roots.workflows}/specdev/W-wayfinder/W-wayfinder.md</Path>`
- **理由：** 为什么这是最小且正确的下一步

## 外部动作

- **远程目标：** 无 / `<Url>https://github.com/owner/repo/issues/123</Url>`
- **关闭能力：** supported / unsupported / not-applicable
- **当前状态：** not-applicable / pending-close / closed / close-failed / waived
- **授权记录：** 无
- **尝试与结果：** 无

外部动作只投影最终完成，不替代本地状态、Ticket、Map 或 Evidence。
