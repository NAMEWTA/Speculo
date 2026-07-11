---
id: runtime-context
type: skill
name: Runtime Context
description: 解析 Speculo 项目根、资产根和 workflow 状态根，向 command/workflow/skill 返回经过边界校验的统一路径上下文。
---

# Runtime Context

从项目根注册表和 workflow XML 声明构造一次运行所需的全部路径。调用方持有持久化责任；本 skill 只解析和验证路径。

## 输入

- 当前工作目录或用户指定的项目目录。
- workflow id，以及对应 `WORKFLOW.md` 中的 `<runtime-context>` 和 `<persistence>`。
- 可选 change 名称和 command id。

## 流程

1. 按 `references/path-resolution.md` 向上定位 `speculo/.speculo/workspace.json`；找不到唯一项目根时返回 blocked。
2. 读取注册表与 workflow 根别名，解析 `workflow/state/commands/skills/vendor`；任一路径越界或目标缺失时返回 blocked。
3. 读取固定状态骨架 `status.json/changes/archive`；选择 change 时派生 `change_root`，不把派生绝对路径写回状态。
4. 返回 project-relative runtime context，供后续所有 skills 复用；后续调用不得重新猜测路径。

## 输出

```text
project_root
workflow_root
state_root
changes_root
archive_root
change_root?
commands_root
skills_root
vendor_roots[]
```

完成标准：所有返回路径均为项目根相对路径、位于声明根内且对应静态资产真实存在；本 skill 未创建任何运行时产物。

## 渐进披露

- `references/path-resolution.md`：定位根注册表、解析 XML 根别名或检查路径越界时读取。
