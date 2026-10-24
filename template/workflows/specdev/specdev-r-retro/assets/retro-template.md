---
schema_version: 3
artifact: retrospective
id: <YYYY-MM-DD-topic[-NN]>
owner: <actual-session-locator>
status: completed
outcome: findings
updated_at: <ISO-8601>
sessions:
  - id: S-001
    host: codex
    session_id: <actual-thread-id>
    locator: sessions/<date>/<actual-rollout-file>.jsonl
    captured_until: <ISO-8601-before-report>
    availability: available
sources:
  - id: E-001
    kind: session
    change: null
    locator: session:codex:<actual-thread-id>
    session_ref: S-001
    anchor:
      start_line: 1
      end_line: 1
      timestamp: <actual-event-time>
      event_id: null
    snapshot: sources/E-001.md
    sha256: <snapshot-byte-sha256>
    quote: <verbatim-excerpt>
findings:
  - id: F-001
    category: automated-checks
    severity: high
    evidence: [E-001]
    remediation_axis: deterministic-check-gap
---

# 开发会话复盘

## Scope
本次会话/change 范围、目标和关键事件脉络、实际来源、采集截止点与未知；未指定会话时为当前会话。本报告属于独立 retro 对象，不改变来源 change。

## Evidence
逐项列 E-ID、来源 change/会话 locator、原文引用与必要上下文。原文使用 blockquote；snapshot 保存同一相关片段，不整份复制日志。source change 与对象内路径分开保存，归档移动后按稳定 change ID 定位。

## Findings
按严重程度排序。按实际信号审视目标、决定、实现、验证、协作、成功经验与七类环境问题，无信号可记不适用；特别核实项目检查命令、hook 和 CI 是否真实接入。无发现时 findings 为 []、outcome 为 no-findings；资料不足时为 insufficient-evidence，并说明缺什么、为什么不能判断。

## F-001
原始现象与证据、根因/假设、影响与独立发生频率、已有约束、建议位置、owner、维护成本、合并关系及不采纳理由。经验应能复用，机械规则进入检查工具，判断性标准交 reviewer。没有发现时删除本节。

## Acceptance
每项建议的正例、目标反例、验证命令/方法、恢复影响与完成条件。尚未实施的建议不能写成已修复。

## Routes
候选的下一入口、具体所需授权、未完成项和恢复条件。仅生成报告不自动更新永久知识、Skill 或检查工具；报告已保存不等于问题已解决。
