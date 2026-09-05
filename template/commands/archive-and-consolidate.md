---
id: archive-and-consolidate
type: command
name: Archive and Consolidate
description: >
  统一入口：Learning 先做用户确认的主题整合或冷归档，其他 workflow 继续使用各自的归档合同。
keywords: [archive, consolidate, learning, topic, cold-archive, 归档, 综合]
---

# Archive and Consolidate 命令

## 报告

统一写入：`<Path>{roots.state}/commands/archive-and-consolidate/{date}-{scope}-{topic}[-NN].md</Path>`。报告记录 workflow、source/root IDs、dry-run 清单、用户确认、relocation manifest、synthesis revision 或 archive locator 和验证结果。

## Learning 路由

目标 workflow 为 Learning 时，读取 `<Path>{roots.workflows}/learning/README.md</Path>`，由用户明确选择一个 Work：

- `C-consolidate`：生成 source manifest 和 dry-run；确认后调用 `<Path>{roots.workflows}/learning/common/tools/relocate-learning.mjs</Path>` 物理移动 active/closed Change 到父 Change 的 `children/`，再生成带 provenance 的 synthesis。未确认时不得移动或更新 context。
- `A-archive`：只处理用户 close/confirm 的 root Change 树，以最新源更新时间决定 `archive/YYYY-MM/`，不要求 Homework、R 或 mastery，也不写 context。

不得把 Learning 交给共享的根级机械归档 skill；该 skill 不能理解递归 locator、parent lock 或单文件 Homework 证据。已冷归档树保持只读，需先由用户显式恢复才能作为 C 的可移动 source。

## 其他 workflow

非 Learning 目标继续读取自身 README 和归档 Work，Command 报告只记录选择和 owning Work 返回的 manifest，不成为知识 writer。

## 完成标准

- dry-run、确认、移动、回滚和最终验证均有报告；
- 原始 Markdown 内容不被覆盖，跨路径引用通过 stable ID/locations 解析；
- 未确认或失败事务不留下部分移动或 context 写入。
