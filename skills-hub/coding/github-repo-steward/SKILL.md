---
name: github-repo-steward
description: 盘点个人 GitHub 仓库和 star，规划或执行具名归档、删除、star/unstar，并诊断 gh/PAT 权限。用于账号级整理；不处理代码修改、普通 issue 或 PR 创建。
license: MIT
compatibility: Requires GitHub CLI (gh), confirmed account/host and network; inventory.sh additionally requires Bash.
metadata:
  author: NAMEWTA
  wta-format-reviewed: '2026-10-06'
---
# GitHub 仓库管家

## 输入与输出契约

明确账号/host、可见仓库范围与模式（只读盘点、建议、具名执行）。已有清单沿用稳定 OWNER/REPO，不因一次授权扩展到新找到的仓库。

给出可见性/分页覆盖、逐仓库建议或执行对照和未知项；权限结论绑定本次 gh 身份与具体端点，不推广到连接器或另一个 PAT。

示例：“只盘点我个人 GitHub 账号的归档仓库和 star，给整理建议。”应进入本技能；“修复当前项目的 TypeScript 类型错误。”不应由本技能接管。

需要当前环境可用的 gh；现有 inventory.sh 还需要 Bash。先确认实际主机、shell、gh 版本及账号。Windows 没有 Bash 时不把 .sh 当 PowerShell 运行：使用 gh 的原生只读查询，标明与完整盘点脚本的覆盖差异，不自动安装 Git Bash/WSL。

技能目录从本文件定位；已有具名授权沿用，读取或整理建议不授权写入。

| 任务 | 参考 |
|---|---|
| 盘点 | [盘点与脚本](references/01-inventory.md) |
| star | [Stars](references/03-stars.md) |
| 归档/删除 | [生命周期](references/02-lifecycle.md) |
| 清理建议 | [Hygiene](references/04-hygiene.md) |
| 认证 | [认证诊断](references/00-auth-and-tokens.md) |

## 只读诊断

先 gh auth status 和必要的账号字段，不打印 token。gh 与连接器/MCP 可能使用不同身份，不能互借权限结论。确认 GitHub.com 或企业 host；不把凭据发送到未经确认的主机。

权限诊断禁止写探针。可读、permissions.admin 或仓库可见都不证明当前凭据能执行某一写动作。分页取全或标记部分；未见到的仓库不等于不存在。

## 具名动作

先确定 OWNER/REPO、动作、影响和已有授权。新增目标不继承旧清单授权。归档使用 gh repo archive 或 PATCH archived 布尔字段，gh api 用 -F 而不是字符串 -f。

删除先说明影响和有条件的恢复限制，不能保证 90 天都可恢复。star/unstar 只处理已批准对象。403 停止受影响动作，报告脱敏权限提示；不切换界面绕过。token 更新后在用户授权范围内重试，不索要明文 token。

不确定写入结果先只读核对，再决定是否重试。删除的 404 必须结合成功删除响应；独立 404 也可能是无权限。

## 完成

报告账号/host、覆盖、具名成功失败、实际状态和未知项。原生 Windows 与 POSIX 路径/引号分别验证，不能把脚本退出成功当成全量清单或写入成功。
