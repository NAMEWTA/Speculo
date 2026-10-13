---
name: person
description: "用于认知方法咨询和双向钢人论证；按具体问题选择能力，不自动启动其他流程。"
metadata:
  speculo-kind: domain-skill
  speculo-id: domain/person
  speculo-domain: person
  speculo-contract-version: "2"
---

# person

## 发现与激活

只读发现不创建状态、不执行 Work、不取得写入授权。先按 ID/关键词定位相关能力和永久知识条目，再少量回读原文与 provenance。用户指定具体 Work 时直接进入该入口；不需要再次激活本领域。

明确进入本领域后读取 <Path>{roots.workflows}/person/common/rules/activation-and-memory.md</Path>，解析 workspace，仅读取当前任务需要的状态、入口与分支参考。缺少输入、权限、有效 schema 或 owner 冲突时停止受影响分支并保留恢复证据。

## 能力路由

<!-- AUTO-INDEX-START -->

- **person/mao-zedong-cognitive-os** — 毛泽东 · 认知操作系统：<Path>{roots.workflows}/person/person-m-mao-zedong-cognitive-os/SKILL.md</Path>
- **person/steelman-deliberation** — 双向钢人论证：<Path>{roots.workflows}/person/person-s-steelman-deliberation/SKILL.md</Path>

<!-- AUTO-INDEX-END -->

## 永久知识

本领域不声明独立永久知识 namespace。

正式写入前检查原 owner/gateway、未闭合事务及恢复证据。读取索引不自动激活能力，未知网关只阻塞对应写入。
