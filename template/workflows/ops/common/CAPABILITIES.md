# 实现与验收边界

这里区分“已经写入可执行代码”与“在本次环境实机通过”。交付验证报告保存实际测试命令、结果与未运行项，不以示例数量代替验收。原执行器的平台能力继续保留；本次工作区重构的测试证据另见仓库 docs/ops-workspace-validation.md，不能把旧版本说明或模拟测试当作本次生产验收。

| 能力 | 实现 | 运行边界 |
|---|---|---|
| 控制端 | Node 标准库 CLI（ops.mjs）；状态、锁、受限凭据、计划、执行 | 无第三方 npm 包；使用一个专用控制工作区的绝对 STATE，不按当前 APP 目录隐式切换 |
| 明确范围 | I 控制端、S 服务器接入、H 服务器维护、D 项目部署、V 资产视图；route 输出明确主体 | server 是 Host.host_id 的用户名称，不是新增第二套服务器账本；原 I/H/D 命令兼容 |
| 连续执行 | 冻结任务规格、一次原始授权、关联原生 plan/approval/apply，逐步骤验证 | H/D 任务内不重复询问；范围/输入/连接/凭据/执行器漂移或过期停止；任意命令仍是受信任代码，不是沙箱 |
| 首次持久化根 | server-discover 不提权读取真实主目录；server-root-confirm 记录用户选定根，新 Host 必需回执 | Linux 无需 Node；其他 SSH 平台需已有 Node；默认真实主目录下 ops，确认不授权安装，旧根不迁移 |
| Host 最小初始化 | server-initialize-spec 生成目录及原双边文档计划；server-connection-spec 验证同机换账号 | Docker/语言环境按需求准备；不递归改 HOME；现有 scp 对含空白根的 Node 引导在写入前阻塞 |
| Linux 接入检查 | SSH 公钥认证、身份、Node、根目录、容量与 Compose profile；16 项清单、时间和摘要 | 公钥/agent 与可信 known_hosts 必须先存在；没有首次密码登录、公钥自动分发或自动信任主机密钥功能；未测安全项明确 unknown |
| Linux local | 原生 oneshot；systemd 配置/权限/健康门；Docker Engine Compose | systemd、Docker 和特权配置需要真实有权限主机验收；临时目录测试不能代替 |
| SSH | OpenSSH 密钥或 agent；固定 known_hosts；目标身份；可 sudo -n；Linux 缺 Node 可用固定 Volta 引导 | 引导 pin 见 common/toolchains/volta-linux.json；Windows 仍要求已有 Node；不实现交互式 SSH 密码登录 |
| Windows 原生 | PowerShell 引导、路径/DACL、同账户登录态 Scheduled Task | 不是无人登录的 Windows Service；真正后台服务需专用 adapter；新 server-check 仅覆盖 Linux |
| WSL | 单独登记为 Linux 执行目标 | 不把 Windows 主机路径/Docker Desktop VM 当作 WSL 根 |
| macOS | 身份探测、POSIX 路径、oneshot | 无 launchd 适配；不承诺全部平台常驻部署 |
| Compose | JSON-as-YAML、显式 context/project、raw env_file、digest image、bind 与 VOLUME 检查 | 要求 Compose >=2.30；strict Engine data-root；Docker Desktop 不自动迁移 |
| uv/Volta/SDKMAN | 明确版本准备与原默认保留配方；命令/默认验证；Linux SSH 固定 Volta/Node 镜像引导 | 管理器安装包必须可信固定；旧 profile 不自动改写；项目真实兼容性另验 |
| 共享服务 | MySQL/Redis/MinIO 分配、existing 验证、owner/binding/依赖排序 | 未知产品须真实版本适配；没有万能数据库备份/恢复；任务范围须显式包含提供者和受影响项目 |
| 升级/回滚/迁移 | 新 spec、固定版本、跨机排序、逐步回执 | H 系统动作与 D 项目动作分开；无隐式零停机/零损失承诺；无自动生成任意项目迁移脚本 |
| 清理 | 只读诊断、cache/log 隔离、精确回执受控 purge | 不普遍删除任意系统垃圾；不 drop_caches 或 prune volume；破坏性任务需独立明确授权 |
| 网络来源 | 完整 commit 的 Git 获取；HTTPS 样本哈希镜像测量 | 显式网络批准；第三方 README/Skill 不是执行授权，不直接执行检索到的安装脚本 |
| 双边记录 | 默认 secret_ref、版本/时间/路径/步骤、受限配置镜像、双边 SHA256 门；明文文档须 opt-in | 不自动备份全部远端业务数据；env 与配置镜像可能含真实秘密，不得公开 |
| 集中记录 | 新任务、服务器检查、视图集中于 records/；保留原 hosts/runs 与 releases 索引 | 不移动或改写旧 plan/approval/journal/回执，不重用旧摘要授权，不自动合并多个 STATE |
| MD / HTML / JSON | V 从资源事实与检查记录生成同批次、可离线打开、双向筛选的只读视图 | 不读取凭据账本/环境/原始任务规格；不是实时监控；内部地址与拓扑仍可能敏感，不直接公开发布 |

无通用数据销毁、通用跨账户 Windows 服务、无凭据 SSH 自动登录、未知产品自动安装、无人审核安装脚本、自动数据库全量恢复功能。这些能力不能靠让 Agent 绕过执行器直接运行命令来冒充。

自定义 host command 的声明写集用于审核和记录，并非内核级系统调用沙箱；管理员批准的是实际 argv/脚本内容和作用范围。托管 APP 必须额外核实真实持久化参数，systemd/只读容器根加强约束，但不对不受信任代码作安全保证。

新功能主手册：<Path>{roots.workflows}/ops/common/WORKSPACE-USAGE.md</Path>。旧 USAGE 中的逐 Run 精确摘要批准仍适用于未采用任务授权的原生命令；不得把任务授权扩展为任意新计划的通行证。
