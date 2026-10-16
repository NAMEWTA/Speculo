---
schema_version: 1
session: "<UTC-round-id>"
task: "<sequence-topic>"
kind: implementation
---

# 任务简报

## Goal
填写 Lead、分配的执行者职责、目标及成功定义。kind 替换为 implementation/review/research/test-observation 的实际值；已有 change/Ticket 可在头部增加 change/ticket，不制造对象。

## Inputs
引用真实 Work SKILL.md、必要规格/项目 Skill、已锁定决定与依赖报告。先读真实入口，按当前阶段执行，不递归启动 Goal、不扩大派遣范围。

## Workspace and Scope
填写实际工作区及基线、允许/只读/共享路径、共享构建输出/端口/测试资源 owner、已授权动作和停止条件。执行者只写分配产物与自己的 REPORT，不写 TASK、定位文件或正式业务状态/Evidence；需要额外权限时返回问题与依据。

## Acceptance
填写真实检查命令、可观察通过标准、未在执行者环境执行的 Gate 及其 owner。整体 E2E 与最终验收由 Lead 核验，候选自报不替代验收。

## Return
填写准确 REPORT 位置及原生提问/通知通道。交付后回读，再按工具原生协议返回任务身份、实际状态、报告位置和一句话摘要。

派遣后准确确认的日志绝对路径由 Lead 写入同目录 session-locator.json 的唯一字段 path。执行者可通过原生通道提供地址；无法准确取得日志地址时省略，不猜路径，不为此阻塞独立可验证的交付。TASK 投递后冻结。
