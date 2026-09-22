# Speculo Runtime State

本目录是 Speculo 运行时状态的唯一持久化根。

## 刷新契约

重新运行 `speculo init` 会以当前模板替换 commands、skills、CLI metadata 与选中的 workflow 静态资产。`.speculo/managed.json` 逐文件记录受管理路径、owner、kind、版本与 SHA-256；未选中的当前受支持 workflow 包保持原样，已移除或未知的静态包不会被带入新安装。

普通 runtime 文件默认 opaque，由 CLI 按字节复制并在替换前复验 hash，不因为扩展名是 JSON 而解析。只有 workflow `runtime-contract.json` 登记的配置和结构化状态进入 schema migrator；未知结构化版本、损坏内容或符号链接会在替换前阻塞，当前安装保持不变。

配置使用 `.speculo/baselines/` 中的上次模板默认值执行 base/local/incoming 三方合并：模板新增项自动增加，模板删除项直接删除，未被用户修改的旧默认值跟随模板更新，用户覆盖值在满足目标合同的前提下保留。只有字段删除、显式 schema 迁移或结构化文件变换时，CLI 才把原文件写入 `back/` 并生成 targeted manifest；opaque 内容不会被整包复制到备份。

`install.json` 使用 schema v3，记录包版本、已安装 workflows、managed manifest 路径和 baseline schema。`kernel.json` 定义共享 change、风险、checkpoint、能力和 trace 位置。Speculo 1.0 不读取或迁移任何 0.x 安装；检测到旧 manifest 时必须先由用户移除或改名旧 `speculo/` 目录。初始化使用项目锁、完整 staging、active fingerprint、配套手册 before/after images 与持久事务阶段记录。正常异常回滚；进程中断后保留现场，通过只读 doctor 检查，再由用户显式 recover 处理。多文件交换不是对所有读者全时刻原子的，保证范围是受测试的进程中断恢复，不宣称跨平台掉电原子性。

## 读取顺序

1. 从项目根打开字面 `speculo/.speculo/workspace.json`（已在本目录时为 `workspace.json`），以当前打开项目为 `project_root` 解析公共 roots。嵌套安装时，项目根 `.speculo/` 不是本目录；只有该文件声明的状态根是运行时状态的唯一持久化根，项目根 `.speculo/specdev` 非法。
2. 从本目录生成的 `catalog.md` 定位已安装能力，再按需读取 `../workflows/<workflow>/INDEX.md` 声明的永久知识；这一步不读取 Work 条目或运行状态。
3. 用户明确激活 workflow 或 work 后，读取 INDEX 指向的 workflow 根 `README.md`，从其中的 Work 条目选择目标并读取具体入口文件。
4. 按激活合同读取 `<Path>{roots.state}/{workflow}/status.json</Path>`。SpecDev/Learning 再读取当前 change `.status.json` 与 work 产物。Ops schema v3 读取 hosts/projects/deployments/allocations/bindings/releases 及对应运行记录，不创建 `changes/`。
5. 历史 change（SpecDev/Learning）只从 `<Path>{roots.state}/{workflow}/archive/{YYYY-MM}/{change}/</Path>` 读取。Ops 运行证据在 `hosts/{host_id}/runs/{run_id}` 或 `releases/{run_id}`。
6. Command 报告位于 `<Path>{roots.state}/commands/{command}/*.md</Path>`，command state 位于 `<Path>{roots.state}/commands/{command}/state.json</Path>`。
7. 独立 Skill 的运行记录位于 `<Path>{roots.state}/skills/{skill}/</Path>`，根级 `state.json` 仅在该 Skill 声明持久 checkpoint 时读取。
8. 首次 docs-sync 确认后读取 `<Path>{roots.state}/{workflow}/docs-sync.json</Path>`；它分列该 workflow 的项目文档和私有 state 更新范围。

## 写入边界

- 每个 workflow 只写 `<Path>{roots.state}/{workflow}/</Path>` 下自己的 `status.json` 和已声明 namespace。SpecDev/Learning 可写 `changes/archive`；Ops v3 写 hosts/projects/deployments 资源账本，不写 change archive。
- `docs-sync.json` 是 docs-sync command 拥有的延迟 sidecar，不进入 `_state`，也不授予越过 workflow 确认规则的权限。
- `.config` 不是标准目录；只有 workflow 声明时才可使用。
- Command 只写 `<Path>{roots.state}/commands/{command}/</Path>`，报告命名为 `<YYYY-MM-DD>-<scope>-<topic>[-NN].md`，禁止覆盖。
- 独立 Skill 只写 `<Path>{roots.state}/skills/{skill}/</Path>`；一次运行目录命名为 `<YYYY-MM-DD>-<kebab-topic>[-NN]`，禁止覆盖。由 command/work 调用时改用调用方提供的 owner 路径。
- `back/` 由 `speculo init` 单一写入；workflow 和 commands 不得修改。
- `install.json`、`managed.json`、`baselines/` 与 refresh contract 由 CLI 拥有，workflow 不得创建、修改或删除。

## 显式中断恢复

`speculo doctor [target] --json` 是只读 installation-integrity 检查，验证配置、roots、manifest 与文件摘要，报告尚未检查的领域状态、宿主行为和服务健康。发现 `.speculo-init.lock/transaction.json` 时输出事务 ID 和阶段。确认原执行进程已停止后，执行 `speculo recover [target] --transaction <id>`。事务 ID、宿主、owner PID、安装 before/after hash、配套文件和目录布局必须匹配；未知锁、仍在运行的 owner、内容漂移或越界链接均保留并阻塞。

committed 阶段只完成清理，其他已记录阶段恢复旧安装与旧手册。未进入持久事务的 stage/owner 锁、恢复自身被强制终止留下的 recovery.lock 或清理窗口中的不完整记录须人工核对，不能仅凭锁龄删除。严禁 rm 未识别备份来“解除阻塞”。项目目录必须可信；这不是阻止同账户恶意进程竞态的沙箱。POSIX 使用文件与目录 fsync，Windows 没有通用目录 fsync，掉电恢复需要宿主备份策略。
