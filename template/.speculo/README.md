# Speculo Runtime State

本目录是 Speculo 运行时状态的唯一持久化根。

## 刷新契约

重新运行 `speculo init` 会以当前模板刷新 commands、skills 与选中的 workflow 静态资产，并对 v0.7+ 运行时执行兼容检查。兼容时递归合并项目配置的当前默认值，并完整保留 workflow 配置、状态索引、`changes/`、`archive/`、永久知识、sidecar、command 报告和具有当前合同的 command `state.json`。

每次刷新先把旧 `config.json` 和旧 `.speculo/` 快照写入 `back/`，排除上一份 `back/` 与旧 pending marker，因此只保留最近一次刷新前备份。`install.json` 记录当前包版本和已安装 workflows；`back/manifest.json` 记录来源/目标版本及每个备份文件的 hash 和大小。

若来源版本、核心 schema、JSON、符号链接、command state owner 或 workflow 索引无法证明兼容，刷新安装当前干净模板状态并创建 `migration.json`，其 `status` 为 `pending`。此时所有 workflow 读取和状态写入都必须停止；只能运行 `migrate-runtime-state` command，基于只读 `back/` 逐项对账、确认并原子迁移。再次运行 `speculo init` 会在任何修改前阻塞。

## 读取顺序

1. 读取 `workspace.json`，以当前打开项目为 `project_root` 解析公共 roots。
2. 检查 `migration.json`；存在 pending 时停止，仅路由到 `migrate-runtime-state` command。
3. 从 `../workflows/<workflow>/INDEX.md` 进入 workflow，再通过 `<Path>` 指针进入具体 work 入口文件。
4. 读取 `<workflow>/status.json`，再读取 `changes/<change>/.status.json` 和当前 work 产物。
5. 历史 change 只从 `<workflow>/archive/YYYY-MM/<change>/` 读取。
6. Command 报告位于 `commands/<command>/*.md`，command state 位于 `commands/<command>/state.json`。
7. 首次 docs-sync 确认后读取 `<workflow>/docs-sync.json`；它分列该 workflow 的项目文档和私有 state 更新范围。

## 写入边界

- 每个 workflow 只写自己的 `status.json/changes/archive` 和已声明 namespace。
- `docs-sync.json` 是 docs-sync command 拥有的延迟 sidecar，不进入 `_state`，也不授予越过 workflow 确认规则的权限。
- `.config` 不是标准目录；只有 workflow 声明时才可使用。
- Command 报告命名为 `<YYYY-MM-DD>-<scope>-<topic>[-NN].md`，禁止覆盖。
- `back/` 由 `speculo init` 单一写入，迁移 command 只读；workflow 和其他 commands 不得修改。
- `install.json` 与 `migration.json` 由 CLI/迁移脚本拥有，workflow 不得创建、修改或删除。
