# Profile、作用域与验收

用于本机/远程统一、多个 Profile 整理、默认窗口切换，以及需要完整备份和多端验收的任务。

## 先划清落点

| 对象 | 设置与扩展的落点 | 不能据此推断 |
| --- | --- | --- |
| 开发机的桌面 VS Code | 该产品、该用户、目标 Profile 的设置与本机扩展 | Remote Server 同时已配置 |
| Windows 等 SSH 客户端 | 客户端 Profile、界面偏好及 Remote - SSH 扩展 | 客户端具备 Linux 路径或项目运行时 |
| SSH/WSL/Container 内的代码 | 活动远程主机的 Remote Settings 和对应工作区扩展 | 远程同名 Profile 就是客户端选中的 Profile |
| 业务项目 | Workspace/Folder 设置与构建声明 | 应被主机统一配置覆盖 |

通常 User → Remote → Workspace/Folder 的后者覆盖前者；语言专用设置和组织策略另有优先级，按有效值检查。先核对扩展 schema 的作用域：可跨机的偏好放客户端 Profile；主机绝对路径放该桌面设置或对应 Remote Settings；项目版本特例留在原项目范围。不复制整份 Linux 配置到 Windows。

通过 `Preferences: Open Remote Settings (JSON)` 和活动 Server 确认远程文件，常见位置是 Server 数据目录的 `Machine/settings.json`，不硬编码 Server 根目录。远程 `User/profiles` 中存在文件不证明客户端选用它；Remote Settings 可能影响同一远程用户的多个窗口，修改前清楚列出影响范围。

默认 Profile 常用 `User/settings.json`，不要求存在 `userDataProfiles`。常见桌面根目录：Linux `$XDG_CONFIG_HOME/Code/User`（默认 `~/.config/Code/User`）、Windows `%APPDATA%\Code\User`、macOS `~/Library/Application Support/Code/User`。命名 Profile、便携版、Insiders 和自定义 `--user-data-dir` 必须从实际实例定位；未创建 settings 文件不等于没有 Profile。

## 创建、选择和同步是不同步骤

- 优先使用 Profiles UI 或目标产品支持的 CLI。用 `--profile` 打开窗口的行为，不能直接推断为 `--install-extension --profile` 会创建不存在的 Profile；先创建/打开，再读回实际 Profile，随后安装。
- 桌面与 Remote CLI 不能互相代用；不同客户端可能留下多个 Server 版本。Ubuntu 桌面与 Windows 所需 Server 版本不同本身不构成故障，让连接客户端管理匹配的 Server，不为统一而删除旧 Server。
- 扩展文件、目标 Profile 注册、启用状态、实际宿主激活分开核验。不编辑内部数据库、UUID/location 清单或 `extensions.json` 来补注册，也不让桌面和 Server 共用扩展目录。
- 新窗口默认 Profile 与已有文件夹/工作区关联分开处理。用户要求统一时，通过正常 Profiles 工作流逐项迁移授权范围内的关联，并重开验证；临时 Profile 或 extension development host 的成功不能证明日常窗口关联已保存。
- Settings Sync 可以搬运 Profile 的可同步内容，不能据此宣称已安装 Remote 扩展。`machine`/`machine-overridable` 设置默认不随同步搬运；不要为了路径一致强制同步所有机器设置。
- 没有 Windows 客户端访问权时，给出客户端选择/导入 Profile、安装 Remote - SSH、连接目标、检查 Local/SSH 扩展和有效设置的步骤。`remote.SSH.defaultExtensions` 会影响连接到的其他主机，只在用户需要该广泛策略时采用；不要强制 `remote.extensionKind` 代替正确安装。

## 备份与回滚

本轮唯一备份目录使用 POSIX `0700` 或 Windows 等效私有 ACL，不存进待提交的项目。记录每个目标的原内容、是否原先不存在、权限/所有权或 ACL、摘要；同时记录扩展 ID/版本/启用状态、Profile 和工作区关联。按需通过官方导出保存 Profile，避免将完整内部数据库或含秘密配置作为公开报告。

每项修改有旧值、新值、理由和作用域。写前重新比较基线，解析失败或文件已被编辑则先停止该文件写入并重新合并；保留权限，采用平台适合的原子替换，读回后记录本轮结果摘要。重复生成差异应为空。

回滚按层次提供：

1. **设置文件**：校验备份完整性和当前文件仍等于本轮写入结果，再恢复原内容/权限；原先不存在的文件仅在未被后续修改时移除。不覆盖用户后续编辑。
2. **扩展与工具**：只撤销本轮新增或变更，保留原有用户内容；恢复版本需要对应可信安装包及受支持安装接口，不能承诺配置备份即可还原二进制。
3. **Profile 与关联**：用受支持 UI/CLI 恢复，不直接回写内部注册数据库。先处理关联再删除本轮创建的 Profile；恢复操作同样不得抹掉后续用户工作。

最少验证备份摘要和回滚预览；复杂批量修改再在临时副本演练恢复、原先不存在、损坏备份及后续编辑拒绝覆盖。明确“已演练”与“已在真实环境回滚”的区别，不为证明可回滚而破坏已完成配置。

## 验收分层

| 层次 | 最小证据 | 结论范围 |
| --- | --- | --- |
| 配置 | JSONC 解析、增量差异、无关键保留、重复执行无差异；目标 Profile 扩展清单与启用状态 | 配置和注册正确，不等于功能激活 |
| 运行时 | 目标环境的版本/实际入口；必要语言的最小编译运行、默认目录和项目特例 | 该环境和样例的工具可用 |
| 编辑器 | 实际目标宿主的生效设置、补全/跳转、诊断、格式化；需要调试时断点停止、继续和退出 | 该编辑器、Profile 和样例通过 |
| 客户端 | 本机日常窗口与真实远程连接分别打开样例，检查扩展位置、终端版本及相关功能 | 仅已连接且实测的客户端通过 |

按本次所需语言选最小隔离样例，不为简单设置变更搭建大型测试框架。Java/Go 可验证编译和补全，Python/TS 验证预期诊断，Vue 验证跳转，格式化器使用确实未格式化的输入；调试只运行已知样例。业务构建和依赖下载须另有任务需要及授权。

测试遇阻先检查正常启动引导、工作区信任、扩展启用/激活、测试输入和等待条件。只对确认可信的最小目录通过正常 UI 授予信任；无 GUI 就报告阻碍，不能关闭 Workspace Trust 或信任整个项目父目录。避免把“已格式化所以无 edits”、提供者尚未激活、调试器子会话未被采集误判为故障。

保留失败和复测记录，清理本任务临时样例及进程，不终止用户正在工作的 VS Code/SSH 会话。旧日志必须结合时间、进程和新复现判断，不能单凭旧异常清缓存或调大内存。虚拟显示/开发扩展宿主的验证要单列，不能冒充物理桌面、业务项目或 Windows Remote 的真人验收。

## 交付清单与资料依据

报告主机/产品版本/Profile、工具入口和项目特例、已存在/新增/保留冲突、备份位置与回滚限制；各层分别列通过、失败、待验证和下一步。客户端不可达时生成可审阅的设置片段与操作步骤，避免包含另一系统的绝对路径。

2026-10-14 亲自读取：[Profiles 与工作区关联](https://code.visualstudio.com/docs/configure/profiles)、[Remote SSH 的扩展位置与主机设置](https://code.visualstudio.com/docs/remote/ssh)、[Settings Sync 的范围](https://code.visualstudio.com/docs/configure/settings-sync)、[设置优先级](https://code.visualstudio.com/docs/configure/settings)。资料用于产品语义；本次 CLI 支持情况和生效结果仍需在实际版本验证。
