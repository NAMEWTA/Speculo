# Ops 工件合同

## 权威与 Owner

| 工件 | Owner | 权威内容 |
| --- | --- | --- |
| 全局 `status.json` | I 创建/激活；A 归档转换 | scope/project/change tuple 索引 |
| `project.json` | I | 稳定项目身份、显示名、aliases 和无凭据 identity |
| Change `.status.json` | 当前 Work；I/A 拥有创建/归档 | 生命周期、当前 Work、当前计划/attempt 和 blocker 投影 |
| `request.md` | I | scope、目标、约束、来源项目和历史关联 |
| `inventory/`、deployment model/dossier | I | 时间点系统事实与项目部署需求 |
| `deployment/target-profile.json` v1 | I | 非敏感期望、operation mode、environment、现场控制面身份、ownership 和授权边界 |
| `plan/plan-NNN.*` v3、approval | P | 绑定 profile/输入摘要的 Gate、候选、数据保护、恢复计划与批量批准 |
| `attempt.json` v2、`journal.jsonl` | E | 每轮执行元数据和 append-only journal-event v1 事实 |
| `verification-state.json` v1、verification/HANDOFF | E | identity/Gate/构件/服务/probe/数据保护/恢复实测及无密钥投影 |
| `RETROSPECTIVE.md`、`promotion/` | A | 全 attempts 复盘和精确知识/归档事务 |
| 全局/项目 context、ADR、runbook | A | 当前、经验证且带 provenance 的运维知识 |

状态 JSON 只投影工件事实。冲突按实际目标、带时间戳观测、target profile、plan/approval、typed journal 与 verification state、RETROSPECTIVE、永久知识、状态索引和 Markdown 投影顺序裁决。HANDOFF 便于交接，不覆盖结构化实测。

## 共享追加工件

LOG、CONTEXT 和 ADR 在 I 创建 change 时初始化。只有 `.status.json.current_work` 指向的 Work 可以追加；每条使用稳定 id、时间和 evidence locator，纠正通过 supersedes 而非重写。CONTEXT 保存 change 内事实候选，ADR 保存真实权衡候选，调试流水和错误留在 LOG/attempt diagnosis。

## 不变量

- project change 只位于 `projects/{project_id}/changes|archive`，global change 只位于根 changes/archive。
- project id、scope 和 change 一经创建不可变；归档只改变 location/lifecycle。
- 已存在 plan、approval、attempt 和 promotion approval 永不覆盖。
- target profile、plan 或 verification state 不保存 secret 值；HANDOFF 只记录 provider/受控 locator、version 与 presence。
- 新 plan 使用 v3，新 attempt 使用 v2；journal 每行独立符合 journal-event v1。
- 旧 plan v2/attempt v1 只读，不能补字段或作为新 pre-execute/pre-close/pre-archive 的充分证据。
- 仅有 legacy attempt 的 completed 候选必须新增 verification-only attempt v2 后才能关闭或提升知识。
- Change-relative POSIX locator 在归档移动后仍可解析。
- approval 只引用一个真实 plan，摘要、固定点和 batch 完全匹配。
- failed operation 不进入现役 SOP；确认的 failure signature 可进入 troubleshooting。
- 归档内容只读；修正通过同 scope follow-up 和 derived_from/supersedes 完成。
