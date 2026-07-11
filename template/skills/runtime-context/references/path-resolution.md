# Path Resolution

## 根定位

1. 从当前工作目录向上寻找 `speculo/.speculo/workspace.json`。
2. 第一个命中的目录是 `project_root`；同时命中多个候选或用户指定目录与候选不一致时停止并澄清。
3. `workspace.json#path_base` 必须为 `project-root`，所有 roots 必须是 POSIX 风格相对路径。

## Workflow 绑定

读取 workflow 的 `<runtime-context>`：

- `base` 必须引用 `workspace.json#roots` 中已有根。
- `path` 不能是绝对路径，不能包含 `..` 或反斜杠。
- `workflow` 和 `state` 必须分别解析到 `speculo/workflows/<workflow>` 与 `speculo/.speculo/<workflow>`。
- vendor 可声明零个或多个具名根，例如 `vendor:matt-pocock`。

固定派生规则：

```text
changes_root = state_root/changes
archive_root = state_root/archive
change_root = changes_root/<change>
```

## 边界检查

- 解析后执行真实路径包含检查；符号链接逃逸与不存在的静态引用均阻塞。
- `<artifact root="change">` 只能落在当前 change。
- `<artifact root="state">` 只能落在 `<persistence>` 声明的额外命名空间。
- command 报告只能落在 `state/commands/<command>/`，skill 不自行选择路径。
- raw vendor skill 未经 workflow runtime context 激活时，不承诺 Speculo 持久化边界。
