# Path Resolution

## 根定位

1. 从当前工作目录向上寻找 `speculo/.speculo/workspace.json`。
2. 第一个命中的目录是 `project_root`；同时命中多个候选或用户指定目录与候选不一致时停止并澄清。
3. `workspace.json#path_base` 必须为 `project-root`，所有 roots 必须是 POSIX 风格相对路径。

## Config 定位

1. 在 `project_root` 下查找 `speculo/config.json`。
2. 若存在，读取并解析其内容；若不存在，以默认值静默降级（`language: "en"`、`persistence.root_override: null`、`defaults.confirm_before_external_write: true`、`defaults.report_language: "en"`）。
3. config 对象由 runtime-context 统一输出，后续调用方不得重新猜测路径或自行解析。

## Workflow 绑定

读取 workflow 同级 `PERSISTENCE.md` 的 `<runtime-context>`：

- `base` 必须引用 `workspace.json#roots` 中已有根。
- `<root base="X" path="Y"/>` 解析为 `workspace.roots[X] + "/" + Y`。`base` 的值在 `workspace.json` 中已经是完整路径——不要将 root ID `X` 作为子目录重新拼接。
- `path` 不能是绝对路径，不能包含 `..` 或反斜杠。
- 验证：解析后，`workflow` 根必须等于 `speculo/workflows/<workflow>`，`state` 根必须等于 `speculo/.speculo/<workflow>`。
- vendor 可声明零个或多个具名根，例如 `vendor:matt-pocock`。

固定派生规则：

```text
changes_root = state_root/changes
archive_root = state_root/archive
change_root = changes_root/<change>
```

**完整示例**——以 `workspace.roots.state = "speculo/.speculo"` 和 `<root id="state" base="state" path="matt-pocock"/>` 为例：
- `state_root = "speculo/.speculo" + "/" + "matt-pocock" = "speculo/.speculo/matt-pocock"`
- **不是** `"speculo/.speculo/state/matt-pocock"`——root ID `"state"` 仅用于在 `workspace.roots` 中查找 base 路径，绝不追加为子目录。
- `changes_root = "speculo/.speculo/matt-pocock/changes"`
- `archive_root = "speculo/.speculo/matt-pocock/archive"`

**Change 名称格式约束：** `<change>` 必须匹配 `^\d{4}-\d{2}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$`（即 `YYYY-MM-DD-<kebab-topic>`）。创建 change 时自动以当天日期为前缀，用户只需提供 topic 部分。手动指定完整名称时，不匹配格式则阻塞并提示正确格式。此格式约束在创建时即强制执行，归档时的日期 kebab 检查作为冗余验证与此处共享同一校验来源。已有不带日期前缀的历史 change 在文档中标注为遗留，归档时不阻塞。

## 边界检查

- 解析后执行真实路径包含检查；符号链接逃逸与不存在的静态引用均阻塞。
- **Vendor root 存在性验证：** 解析后的每个 vendor root 必须验证目标目录存在；缺失时返回明确错误信息指明缺失的具体路径，禁止静默跳过。此规则与 workflow/state/commands/skills 根的验证同等生效。
- `<artifact root="change">` 只能落在当前 change。
- `<artifact root="state">` 只能落在 `<persistence>` 声明的额外命名空间。
- command 报告只能落在 `state/commands/<command>/`，skill 不自行选择路径。
- raw vendor SKILL 只通过同 workflow 的一对一 atomic wrapper 激活；wrapper 先加载 `PERSISTENCE.md`，嵌套 skill 名称继续解析到 wrapper。
- 解析任何 `<root>` 元素后，验证结果路径中**不包含**该 root ID 作为重复路径段。例如 `speculo/.speculo/state/` 总是错误的——`state` root ID 已在 `workspace.roots` 查找中被消费，不应作为子目录再次出现。
