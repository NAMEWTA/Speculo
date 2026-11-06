---
name: github-repo-steward
description: 盘点和整理 GitHub 账号的仓库与 stars，执行具名归档或删除，并诊断对应的 gh/PAT 权限。
license: MIT
---

# GitHub 仓库与收藏整理

先确定 GitHub.com 或企业实例、实际身份、仓库范围和请求模式。只读盘点可以形成建议；已明确授权的清单可以执行，不需要逐项重复确认。新发现的对象不自动加入删除范围。

## 先建立可信清单

使用当前可用连接器或 `gh`，区分它们各自的账号和访问范围。先确认身份，不打印 token；能读仓库不证明当前凭据能执行删除或归档。

本包 [inventory.sh](scripts/inventory.sh) 使用 Bash 与 gh，自动分页。没有 Bash 时用当前平台支持的只读接口，说明覆盖差异：

```bash
bash "$SKILL_DIR/scripts/inventory.sh"
bash "$SKILL_DIR/scripts/inventory.sh" --stars
```

`SKILL_DIR` 是本文件目录。脚本的 `--user LOGIN` 改变仓库 owner，`--stars` 始终查询当前认证账号的收藏。

按 [盘点方法](references/01-inventory.md) 区分自有原创、fork、归档和空仓，保留完整的 OWNER/REPO。分页失败标明已覆盖范围；“没有看到”不等于“不存在”。

## 形成整理判断

结合实际用途、独有提交、外部依赖、替代仓库和维护意图，而不只看最后 push 时间或 star 数。稳定项目长期无提交也可能仍在使用。CI 失败和开放 PR 多都不是删除理由。

[整理依据](references/04-hygiene.md) 帮助区分继续保留、归档、删除和取消收藏。各建议解释它解决什么问题，必要时核对发布包、Pages、文档链接或 fork 中的独有工作。

## 执行具名动作

| 动作 | 参考与核验 |
| --- | --- |
| 归档 / 取消归档 | [生命周期](references/02-lifecycle.md)；读回 `archived` 与仓库身份 |
| 删除仓库 | 同一参考；确认对象及影响，结合成功响应核对，不能只凭一个 404 |
| star / unstar | [Stars](references/03-stars.md)；账号级权限与结果分别核对 |
| 401 / 403 | [认证诊断](references/00-auth-and-tokens.md)；实际身份、端点与响应证据 |

归档 API 的布尔字段用 `gh api -F`；删除的恢复条件受平台限制，不能保证可撤销。超时先查询现状，避免重复副作用。

权限拒绝只停止受影响动作，报告具体缺口；不能为绕过拒绝切换身份或界面。用户完成正常权限修正后，再按已授权范围继续。

交付实际覆盖、逐对象结果和剩余问题。较大整理可更新一份现有清单供接续；不需要另建账户状态库。[来源](references/05-sources.md) 用于核对平台变化。
