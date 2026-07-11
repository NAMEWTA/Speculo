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
2. 读取注册表与 workflow 根别名，解析 `workflow/state/commands/skills/vendor`。
   - 对每个解析后的 vendor root 执行存在性验证：目标目录必须存在，否则返回明确错误信息指明缺失的具体路径，禁止静默跳过。
   - 任一路径越界或目标缺失时返回 blocked。
3. 读取 `speculo/config.json`（若存在）；不存在时以默认值静默降级（`language: "en"`、`persistence.root_override: null`、`defaults.confirm_before_external_write: true`、`defaults.report_language: "en"`）。
4. 读取固定状态骨架 `status.json/changes/archive`；选择 change 时派生 `change_root`，不把派生绝对路径写回状态。
   - **Change 名称格式校验：** change 名称必须匹配 `^\d{4}-\d{2}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$`（即 `YYYY-MM-DD-<kebab-topic>`）。
   - 创建 change 时自动以当天日期为前缀（`YYYY-MM-DD-`），用户只需提供 topic 部分。
   - 手动指定完整 change 名时，不匹配格式则阻塞并提示正确格式：`YYYY-MM-DD-<kebab-topic>`。
   - 已有不带日期前缀的历史 change 标注为遗留，不阻塞但记录警告。
   - 校验逻辑定义为单一来源（本步骤），归档端（`finalize-archive.md`）的日期 kebab 检查引用同一格式规则。
5. 返回 project-relative runtime context，供后续所有 skills 复用；后续调用不得重新猜测路径。

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
config?
```

`config` 字段包含已解析的 `{language, persistence: {root_override}, defaults: {confirm_before_external_write, report_language}}`。

完成标准：所有返回路径均为项目根相对路径、位于声明根内且对应静态资产真实存在；vendor root 已通过存在性验证；change 名称已通过格式校验；本 skill 未创建任何运行时产物。

## 渐进披露

- `references/path-resolution.md`：定位根注册表、解析 XML 根别名、config 定位与降级规则、change 名称格式约束或检查路径越界时读取。
