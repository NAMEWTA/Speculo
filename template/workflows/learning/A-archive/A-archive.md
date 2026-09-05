---
id: learning/archive
type: workflow-entry
workflow: learning
name: 冷归档
description: 用户明确关闭后移动整个 Change 树到日期目录；不做知识综合或掌握判断。
keywords: [archive, cold-archive, close]
---

# 冷归档

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/learning/README.md</Path>`。

## 流程

1. 用户明确指定 root Change 并写入 close/confirm；没有确认只输出待归档清单。
2. 检查 root 没有 active Work 或活动子树；未完成 Homework、未做 R 或未掌握不构成阻塞，证据随树保留。
3. 以整棵树所有节点 `updated_at` 的最大值作为 `YYYY-MM`，在锁内 stage 并移动 `changes/<root>` 到 `archive/YYYY-MM/<root>`，更新 locations/status projection。
4. 验证旧路径不存在、新路径存在、哈希和索引完整；失败回滚。归档树只读，后续纠正通过新 Change；A 不写 context。

## 完成标准

- 没有静默删除或改写原始课程、作业、答案、Review 或 synthesis；
- archive 是用户关闭的历史容器，不等同于 mastered；
- 归档日期以最新源更新时间为准，原始时间和 relocation history 仍可追溯。
