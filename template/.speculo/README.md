# Speculo Runtime State

本目录是 Speculo 运行时状态的唯一持久化根。

## 读取顺序

1. 读取 `workspace.json`，以当前打开项目为 `project_root` 解析公共 roots。
2. 从 `../workflows/<workflow>/INDEX.md` 进入 workflow，再通过 `<Path>` 指针进入具体 work 入口文件。
3. 读取 `<workflow>/status.json`，再读取 `changes/<change>/.status.json` 和当前 work 产物。
4. 历史 change 只从 `<workflow>/archive/YYYY-MM/<change>/` 读取。
5. Command 报告位于 `commands/<command>/*.md`，command state 位于 `commands/<command>/state.json`。
6. 首次 docs-sync 确认后读取 `<workflow>/docs-sync.json`；它分列该 workflow 的项目文档和私有 state 更新范围。

## 写入边界

- 每个 workflow 只写自己的 `status.json/changes/archive` 和已声明 namespace。
- `docs-sync.json` 是 docs-sync command 拥有的延迟 sidecar，不进入 `_state`，也不授予越过 workflow 确认规则的权限。
- `.config` 不是标准目录；只有 workflow 声明时才可使用。
- Command 报告命名为 `<YYYY-MM-DD>-<scope>-<topic>[-NN].md`，禁止覆盖。
