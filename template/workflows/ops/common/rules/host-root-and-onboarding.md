# Host 首次接入与持久化根

S 在首次接入、确认根或更换连接时读取；H 最小初始化与 D 持久化预检也读取。本合同拥有账号探测和根确认规则；系统安装、项目部署、知识改写仍由原网关授权。

## 三段流程与两个管理维度

I 先初始化发起操作的控制端；S 接入用户指定 Host，再由 H 完成该 Host 的最小初始化；D 将明确 Project 安排到一个或多个明确 Host。Host 管机器身份、连接和持久化根；Project 管来源及项目需求；Deployment 连接项目、Host、环境和实例。V 提供双向只读视图。五个 Work 保留，不创建第二套 Server 账本。

只要求连接时，S 完成接入后返回 H 路由；用户已请求服务器初始化或项目安装时，已获授权的前置步骤连续执行。根目录选择不替代软件安装或项目部署授权。

## 首次选择

1. 已验证 host key 和 key/agent 登录具备后，执行 `server-discover --server ID --connection-file ABSOLUTE_FILE`。连接文件提供 platform、transport、connection；无需先有 root 或 Node。
2. Linux 使用不提权的 POSIX 只读探测，从实际登录 uid 的账号数据库得到账号和主目录；不得用控制端 HOME、sudo 后的 HOME 或 `/home/用户名` 推测。Windows/macOS SSH 仍需已有 Node，通过远端账号信息读取真实主目录；显式 local Host 使用本机账号信息。
3. 默认建议为真实主目录的 `ops` 子目录，例如 `/home/wta/ops`、`/root/ops`。首次必须由用户输入绝对路径或明确接受建议。用户已明确指定就记录其原话，不重复询问；静默、示例、任务文件和默认值不是确认。
4. 使用 `server-root-confirm --server ID --discovery DISCOVERY_ID --root ABSOLUTE_ROOT --by USER --statement '实际确认原话与来源'`。该命令只写控制端回执，不创建远端目录。取消或未确认时不登记新 Host，不安装、不写目标。
5. 将返回的 `identity`、`root`、`root_confirmation` 原样放入 Host 输入；需要固定 Node 引导时，连接文件也携带这些字段。`register/enroll` 新 Host 缺回执会阻塞；不能以 `identity=discover` 绕过确认。必要的 Node 引导继续要求可信固定 tar、SHA256 和独立 ack，然后 enroll 保存真实 inventory。

默认根统一承载服务器文档、项目配置、业务数据、日志、备份、受管工具链和 Docker data-root。控制端 `.speculo/ops` 仍保存资源账本、受限凭据及双边执行证据；不是把控制端目录移到服务器。

## 路径与权限

根必须为规范化绝对路径和专用子目录，不能是账号主目录本身、系统目录、链接/junction/UNC/ADS 路径或已登记根的重叠目录。探测检查路径祖先和受管入口，首次使用非空无 owner 根必须先选择空目录或取得专门的接管方案，不能覆盖其 README 或业务文件。

检查登录账号对根或最近已有父目录的写入/搜索权限；不足就明确列出待处理权限，不改用另一目录，不递归 chown/chmod HOME。Linux bootstrap 在登录账号身份下写入；缺 Node 且根包含空白时，现有 scp 适配不支持，必须在写入前阻塞并说明可先提供现有 Node。H 的特权动作仍按明确计划提权。

执行前重读回执、身份与路径。探测和确认期间身份、账号、主目录或 known_hosts 漂移则重新探测；这不允许自动接受新 host key。目标根的 `.ops-host.json` 继续由原执行器及固定 bootstrap 网关建立，绑定 host_id 与机器身份；其他 owner、锁、失败和 unknown 保留现场。

新确认 Host 的目录锁与解锁使用实际登录账号，确保首次根、owner 标记和锁目录仍由该账号持有；具体计划步骤才按 connection.sudo 提权。已有无确认引用的 Host 保留原执行身份。不会递归变更既有文件的所有者或权限。

## 最小初始化与后续使用

登记后使用 `server-initialize-spec --server ID --output ABSOLUTE_FILE` 生成 H/prepare 规格，经原 plan/approve/apply 或获准 H/D task 执行。它只补齐 `_host/cache`、`_host/installers`、`_host/toolchains`、`_runtime`、`docs/standards`、`knowledge`，并由原生成器交付 README、DEPLOYMENTS 与双边回执；已有目录复用。

Docker、Compose、Python、Java、Node 项目版本及 Nginx/WireGuard 按项目要求进入 H 对应分支。既有 Docker data-root 不一致仍需单独迁移方案。登记、目录准备、文档交付、compose/native 就绪分别呈现；base-ready 不代表任意项目可部署。

项目根始终由 host.root/project_id 派生；显式多实例沿用 project/instances/environment/instance。D 不另选服务器根、不从 cwd 或上次目标推断部署位置。布局细节读取 `<Path>{roots.workflows}/ops/common/rules/deployment-layout.md</Path>`。

## 同机换账号、兼容和恢复

同机新账号复用既有 Host 与原根。使用 `server-connection-spec --server ID --connection-file ABSOLUTE_FILE --output ABSOLUTE_FILE` 验证同机身份、新账号与原根权限，生成资源连接更新，走 S 拥有的原精确 plan/approve/apply 网关；H/D task 不得借此扩大连接权限。它保留原 root_confirmation，新会话成功后再讨论旧登录通道撤销。

已有 v3 Host 可以没有 root_confirmation，原 `/srv/ops` 等根继续有效，不补造历史确认、不修改旧 Run/Release。旧同机多根账本在需要自动识别/重接入时阻塞歧义，既有明确 Host/root 的运行证据保留。不自动合并账本或迁移目录；实际根迁移另行形成可恢复方案。

schema v3 的 Host.root 是唯一路径事实源。S 独占 `<Path>{roots.state}/ops/records/servers/{host_id}/onboarding/</Path>` 的 discovery/root 回执；独立 schema，带源摘要、原话、确认者和时间，原子排他写入后回读。Host.root_confirmation 只存 receipt_id/digest 引用。只读 V 仅投影允许的摘要，不导出原始确认语句或连接凭据文件。

bootstrap 将 started/installed 证据保存在 `<Path>{roots.state}/ops/hosts/{host_id}/bootstrap/</Path>`。同一机器/根的引导一旦 started 不自动重放，换确认回执也不能绕过；先读取报错给出的 attempt 文件、收据和远端现场，确认旧进程已停止。仅在用户明确授权恢复、原固定构件/账号/路径摘要一致时，原 bootstrap-node 参数追加 `--recover-ack I-VERIFIED-BOOTSTRAP-IS-STOPPED --recovery-statement 实际恢复授权原话`；保存旧 attempt 的不可覆盖 recovery 记录后重试。输入不同则阻塞，另行设计修复。H/D 的失败、docs_pending、unknown 按 `<Path>{roots.workflows}/ops/common/rules/recovery.md</Path>` 恢复，文档补交不重跑业务。
