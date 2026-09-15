---
id: archive-and-consolidate
type: command
name: Archive and Consolidate
description: Archive or consolidate a user-selected completed change and its knowledge under the owning workflow contract.
keywords: [archive, consolidate, learning, topic, cold-archive, 归档, 综合]
---

# Archive and Consolidate 命令

## 持久化契约

唯一报告路径：

```text
<Path>{roots.state}/commands/archive-and-consolidate/{date}-{scope}-{topic}[-NN].md</Path>
```

实际路径必须通过 `<Path>{roots.state}/workspace.json</Path>` 的 `roots.state` 解析。解析后同时记下：

- `commands_def_root` = `{roots.commands}`：只放命令定义
- `commands_root` = `{roots.state}/commands`：只放 command 报告

`{roots.commands}` 不是报告根。禁止把 `YYYY-MM-DD-*.md` 写入 `{roots.commands}/archive-and-consolidate/` 或任何定义目录旁边。

POSIX 规范化后：

- `commands_root` 必须等于 `{roots.state}/commands`
- `commands_root` 等于 `{roots.commands}`，或报告路径落在 `{roots.commands}` 下 → **blocked，不写文件**
- `{roots.commands}/archive-and-consolidate/` 已存在 `YYYY-MM-DD-*.md` → **blocked**；列出误落盘文件，要求先搬到 `<Path>{roots.state}/commands/archive-and-consolidate/</Path>`。目标同名则加 `-NN`，不覆盖正文

规则：

- `<scope>`：目标 workflow 名
- `<topic>`：change 名或 `batch`
- 同日同 scope/topic 冲突时，从 `-01` 选择最小未占用编号
- 禁止覆盖已有报告
- 禁止把正式报告写入 `temp/`、系统临时目录、`{roots.commands}/`、`{roots.state}/{workflow}/` 或其他位置
- 报告记录 workflow、source/root IDs、dry-run 清单、用户确认、relocation manifest、synthesis revision 或 archive locator、`path_context.commands_root` 和验证结果

## 运行时解析

1. 从当前目录向上寻找 `<Path>{roots.state}/workspace.json</Path>`；无法唯一确定时停止并提示 `speculo init`。
2. 读取并验证 `path_base` 与 roots，再读取 `<Path>{roots.config}</Path>`（不存在时静默降级）。
3. 在调用任何 skill 或 Work 之前完成上面的 `commands_root` 校验。
4. 把 `commands_root` 作为报告 owner 路径传给后续 skill/Work；返回的 `path_context.commands_root` 若不等于 `{roots.state}/commands`，停止且不写文件。

无论走 Learning Work 还是其他 workflow，Command 报告都只写 `<Path>{roots.state}/commands/archive-and-consolidate/</Path>`。

## Learning 路由

目标 workflow 为 Learning 时，读取 `<Path>{roots.workflows}/learning/README.md</Path>`，由用户明确选择一个 Work：

- `C-consolidate`：生成 source manifest 和 dry-run；确认后调用 `<Path>{roots.workflows}/learning/common/tools/relocate-learning.mjs</Path>` 物理移动 active/closed Change 到父 Change 的 `children/`，再生成带 provenance 的 synthesis。未确认时不得移动或更新 context。
- `A-archive`：只处理用户 close/confirm 的 root Change 树，以最新源更新时间决定 `archive/YYYY-MM/`，不要求 Homework、R 或 mastery，也不写 context。

不得把 Learning 交给共享的根级机械归档 skill；该 skill 不能理解递归 locator、parent lock 或单文件 Homework 证据。已冷归档树保持只读，需先由用户显式恢复才能作为 C 的可移动 source。

## OPS 资源运行记录

OPS 2.2 没有 change 归档 Work。读取 OPS 自身 README，按 host_id/project_id/deployment_id/run_id 查看已完成运行。不得调用旧 A-archive-and-learn 或将主机、APP、持久化数据移动到 change archive。冷备份运行证据必须由用户单独明确选择、保留引用与文件哈希，不能删除资源账本或双边明文记录。Command 不直接修改 OPS 状态。

## 其他 workflow

非 Learning 且非 OPS 目标继续读取自身 README 和归档 Work，并在 Work 要求时读取 `<Path>{roots.skills}/archive-and-consolidate/SKILL.md</Path>`。Command 报告只记录选择和 owning Work/skill 返回的 manifest，不成为知识 writer。

## 完成标准

- dry-run、确认、移动、回滚和最终验证均有报告；
- 报告只出现在 `<Path>{roots.state}/commands/archive-and-consolidate/</Path>`；`path_context.commands_root` 等于 `{roots.state}/commands`，不等于 `{roots.commands}`；
- 原始 Markdown 内容不被覆盖，跨路径引用通过 stable ID/locations 解析；
- 未确认或失败事务不留下部分移动或 context 写入。
