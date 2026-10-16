---
schema_version: 1
artifact: retro-upgrade
id: <YYYY-MM-DD-skill-upgrade[-NN]>
owner: <actual-session-locator>
created_at: <ISO-8601>
inputs:
  - report: <retro-id>
    sha256: <RETRO.md-byte-sha256>
decisions:
  - report: <retro-id>
    finding: F-001
    disposition: adopt
    reason: <current-project-evidence-and-selection-reason>
    targets: [.agents/skills/<skill>/SKILL.md]
changes:
  - path: .agents/skills/<skill>/SKILL.md
    action: update
    owner: project
    before_sha256: <current-byte-sha256>
    after_sha256: <candidate-byte-sha256>
    candidate: candidates/<skill>/SKILL.md
archive_reports: [<fully-disposed-retro-id>]
---

# 项目 Skill 升级方案

## Scope
冻结本轮未归档 RETRO 清单、原文来源与当前项目事实；列合并、相反证据及覆盖缺口。没有输入时返回 no-candidates，不创建空方案。

## Decisions
每份报告的每个 F-ID 必须有且仅有一个 adopt/reject/defer。adopt 指向精确目标；合并发现共用目标并说明理由。reject 说明不采纳原因；defer 说明下一入口和缺失条件，两者 targets 均为 []。无发现的报告也可在明确确认后归档。

## Changes
逐项给出更新/新增/保留的 Skill、完整候选与可审阅 diff、原 owner、触发和行为变化、当前事实依据与恢复原件。create 的 before_sha256 为 null；retain 的前后摘要相同且不写入；update 的摘要必须不同。Builder 内容的 owner 为 engineering-standards-builder，清单与全部关联文件一起列入候选。

## Validation
逐项列正反例、现有检查命令、预期结果、宿主实际调用是否可观察。所有 changes 都必须被 adopt 关联；只改格式不视为已解决问题。方案批准后冻结 PLAN.md 与 candidates；执行结果单独记录，不修改批准所绑定的字节。

## Archive
列拟归档报告及资格、仍待处理报告、归档路径和先验证后移动顺序。方案确认同时覆盖本节的具体归档范围；范围变更重开相关确认。方案对象最后归档，不连带移动来源 change。
