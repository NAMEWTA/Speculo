# Speculo Runtime State

本目录是 Speculo 运行时状态的唯一持久化根。

## 刷新契约

重新运行 `speculo init` 会以当前模板替换 commands、skills、CLI metadata 与选中的 workflow 静态资产。`.speculo/managed.json` 逐文件记录受管理路径、owner、kind、版本与 SHA-256；未选中的当前受支持 workflow 包保持原样，已移除或未知的静态包不会被带入新安装。

普通 runtime 文件默认 opaque，由 CLI 按字节复制并在替换前复验 hash，不因为扩展名是 JSON 而解析。只有 workflow `runtime-contract.json` 登记的配置和结构化状态进入 schema migrator；未知结构化版本、损坏内容或符号链接会在替换前阻塞，当前安装保持不变。

配置使用 `.speculo/baselines/` 中的上次模板默认值执行 base/local/incoming 三方合并：模板新增项自动增加，模板删除项直接删除，未被用户修改的旧默认值跟随模板更新，用户覆盖值在满足目标合同的前提下保留。只有字段删除、显式 schema 迁移或结构化文件变换时，CLI 才把原文件写入 `back/` 并生成 targeted manifest；opaque 内容不会被整包复制到备份。

`install.json` 使用 schema v2，记录包版本、已安装 workflows、managed manifest 路径和 baseline schema。初始化以项目锁、完整 staging、active fingerprint 复验、原子 rename 与失败 rollback 组成一个事务；冲突不会发布部分结果，也不会创建新的 pending marker。

## 读取顺序

1. 读取 `workspace.json`，以当前打开项目为 `project_root` 解析公共 roots。
2. 从 `../workflows/<workflow>/INDEX.md` 发现 workflow并按需读取其中声明的永久知识；这一步不读取 Work 条目或运行状态。
3. 用户明确激活 workflow 或 work 后，读取 INDEX 指向的 workflow 根 `README.md`，从其中的 Work 条目选择目标并读取具体入口文件。
4. 按激活合同读取 `<Path>{roots.state}/{workflow}/status.json</Path>`，再读取 `<Path>{roots.state}/{workflow}/changes/{change}/.status.json</Path>` 和当前 work 产物。
5. 历史 change 只从 `<Path>{roots.state}/{workflow}/archive/{YYYY-MM}/{change}/</Path>` 读取。
6. Command 报告位于 `<Path>{roots.state}/commands/{command}/*.md</Path>`，command state 位于 `<Path>{roots.state}/commands/{command}/state.json</Path>`。
7. 独立 Skill 的运行记录位于 `<Path>{roots.state}/skills/{skill}/</Path>`，根级 `state.json` 仅在该 Skill 声明持久 checkpoint 时读取。
8. 首次 docs-sync 确认后读取 `<Path>{roots.state}/{workflow}/docs-sync.json</Path>`；它分列该 workflow 的项目文档和私有 state 更新范围。

## 写入边界

- 每个 workflow 只写 `<Path>{roots.state}/{workflow}/</Path>` 下自己的 `status.json/changes/archive` 和已声明 namespace。
- `docs-sync.json` 是 docs-sync command 拥有的延迟 sidecar，不进入 `_state`，也不授予越过 workflow 确认规则的权限。
- `.config` 不是标准目录；只有 workflow 声明时才可使用。
- Command 只写 `<Path>{roots.state}/commands/{command}/</Path>`，报告命名为 `<YYYY-MM-DD>-<scope>-<topic>[-NN].md`，禁止覆盖。
- 独立 Skill 只写 `<Path>{roots.state}/skills/{skill}/</Path>`；一次运行目录命名为 `<YYYY-MM-DD>-<kebab-topic>[-NN]`，禁止覆盖。由 command/work 调用时改用调用方提供的 owner 路径。
- `back/` 由 `speculo init` 单一写入；workflow 和 commands 不得修改。
- `install.json`、`managed.json`、`baselines/` 与 refresh contract 由 CLI 拥有，workflow 不得创建、修改或删除。
