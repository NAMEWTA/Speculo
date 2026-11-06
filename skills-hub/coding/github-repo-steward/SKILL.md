---
name: github-repo-steward
description: 盘点和整理 GitHub 账号的仓库、归档与 stars，或诊断 gh/PAT 对这些操作的权限。
license: MIT
---

# GitHub 仓库整理

先确定 GitHub.com 或企业实例、当前身份与用户要整理的范围。只读盘点与建议不修改仓库；已有明确授权的清单可以继续执行，不逐项重复询问。
使用当前可用连接器或 `gh`。本包的 [inventory.sh](scripts/inventory.sh) 需要 Bash 与 gh；原生 Windows 没有 Bash 时使用平台原生命令，不为盘点安装另一套环境。

按需要读取：

- [盘点与分页](references/01-inventory.md)：仓库与收藏清单、可见范围。
- [归档与删除](references/02-lifecycle.md)、[Stars](references/03-stars.md)：具体 API 和效果。
- [整理依据](references/04-hygiene.md)：保留、归档或删除的判断。
- [认证诊断](references/00-auth-and-tokens.md)：当前凭据与端点权限；[来源](references/05-sources.md) 用于核验版本。

权限结论只适用于实际使用的身份和端点，gh 与连接器可能不同。查询失败标明部分覆盖，不把“未看到”当成不存在，也不用写探针测试权限。
执行前核对准确的 `OWNER/REPO` 与动作，新发现的对象不自动加入删除范围。归档 API 的布尔字段用 `gh api -F`，不要传字符串。
删除不可保证恢复。超时或不确定响应先读回；单独一个 404 也可能意味着无权限。403 只停止受影响操作，不通过换界面绕过限制。

交付实际覆盖、逐对象结果和剩余问题。只有本地盘点时，不声称远端已经整理完成。
