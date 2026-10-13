---
name: media
description: "用于创作简报、拆解、手绘、视频、发布草稿及复盘；发布由实际授权控制。"
metadata:
  speculo-kind: domain-skill
  speculo-id: domain/media
  speculo-domain: media
  speculo-contract-version: "2"
---

# media

## 发现与激活

只读发现不创建状态、不执行 Work、不取得写入授权。先按 ID/关键词定位相关能力和永久知识条目，再少量回读原文与 provenance。用户指定具体 Work 时直接进入该入口；不需要再次激活本领域。

明确进入本领域后读取 <Path>{roots.workflows}/media/common/rules/activation-and-memory.md</Path> 与 <Path>{roots.workflows}/media/common/rules/domain-runtime.md</Path>，解析 workspace，仅读取当前任务需要的状态、入口与分支参考。缺少输入、权限、有效 schema 或 owner 冲突时停止受影响分支并保留恢复证据。

## 能力路由

<!-- AUTO-INDEX-START -->

- **media/brief** — 选题与母内容简报：<Path>{roots.workflows}/media/media-b-brief/SKILL.md</Path>
- **media/deconstruct** — 对标结构拆解：<Path>{roots.workflows}/media/media-d-deconstruct/SKILL.md</Path>
- **media/hand-drawn** — 固定画风提示词：<Path>{roots.workflows}/media/media-h-hand-drawn/SKILL.md</Path>
- **media/init-setup** — 创作者初始化：<Path>{roots.workflows}/media/media-i-init-setup/SKILL.md</Path>
- **media/publish-draft** — 多渠道本地草稿：<Path>{roots.workflows}/media/media-p-publish-draft/SKILL.md</Path>
- **media/retro** — 数据复盘与模板沉淀：<Path>{roots.workflows}/media/media-r-retro/SKILL.md</Path>
- **media/video** — 可验证代码视频：<Path>{roots.workflows}/media/media-v-video/SKILL.md</Path>

<!-- AUTO-INDEX-END -->

## 永久知识

- <Path>{roots.state}/media/context/INDEX.md</Path>

正式写入前检查原 owner/gateway、未闭合事务及恢复证据。读取索引不自动激活能力，未知网关只阻塞对应写入。
