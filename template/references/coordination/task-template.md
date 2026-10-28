---
schema_version: 2
session: "<UTC-round-id>"
task: "<sequence-topic>"
kind: planning
---

# 任务简报

## Goal
填写 Lead、分配的执行者职责、目标、用户指定的交付数量及成功定义。kind 填写本次真实用途，如 planning、tickets、explanation、review 或用户明确要求的 handoff；用途不是权限；已有 change/Ticket 可在头部增加 change/ticket，不制造对象。

## Inputs
引用实际调用的 Work/Skill 入口（若需要）、必要规格/项目 Skill、已锁定决定与依赖报告。先读真实入口，按当前阶段执行，不擅自扩大编排或再次派遣、不扩大派遣范围。

## Workspace and Scope
填写实际工作区及基线、允许/只读/共享路径、共享构建输出/端口/测试资源 owner、已授权动作和停止条件。执行者可直接生成或修改分配的计划、票据、地图、说明等产物与自己的 REPORT，不写 TASK 或正式业务状态/Evidence，也不在任务目录留下其他文件；需要额外权限时返回问题与依据。

## Acceptance
填写真实检查命令、可观察通过标准、未在执行者环境执行的 Gate 及其 owner。整体 E2E 与最终验收由 Lead 核验，候选自报不替代验收。

## Return
填写准确 REPORT 位置及原生提问/通知通道。交付后回读，再按工具原生协议返回任务身份、实际状态、报告位置和一句话摘要。

TASK 投递后冻结。准确确认的会话日志绝对路径只写在 REPORT 的可选 `Session log` 行；无法准确取得时省略该行，不猜路径，不另建文件，也不为此阻塞独立可验证的交付。
