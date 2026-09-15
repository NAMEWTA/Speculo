# 实现与验收边界

这里区分“已经写入可执行代码”与“在本次环境实机通过”。交付验证报告保存实际测试命令、结果与未运行项，不以示例数量代替验收。

| 能力 | 本版实现 | 运行边界 |
|---|---|---|
| 控制端 | Node 标准库 CLI（ops.mjs）；状态、锁、明文、计划、执行 | 无第三方 npm 包；控制端可本地执行完整闭环 |
| Linux local | 原生 oneshot；systemd 配置/权限/健康门；Docker Engine Compose | 本轮隔离 local oneshot 演练；systemd/Docker 需要真实有权限主机验收 |
| SSH | OpenSSH 密钥或 agent；固定 known_hosts；目标身份；可 sudo -n | 目标 Node；本轮没有远程主机/ssh 客户端实机验证；不实现交互式 SSH 密码登录 |
| Windows 原生 | PowerShell 引导、路径/DACL、同账户登录态 Scheduled Task | 不是无人登录的 Windows Service；真正后台服务需专用 adapter；本轮非 Windows 实机 |
| WSL | 单独登记为 Linux 执行目标 | 不把 Windows 主机路径/Docker Desktop VM 当作 WSL 根 |
| macOS | 身份探测、POSIX 路径、oneshot | 无 launchd 适配；不是承诺全部平台常驻部署 |
| Compose | JSON-as-YAML、显式 context/project、raw env_file、digest image、bind 与 VOLUME检查 | 要求 Compose >=2.30；strict Engine data-root；Docker Desktop 不自动迁移 |
| uv/Volta/SDKMAN | 明确版本准备与原默认保留配方；命令/默认验证 | 管理器安装包必须可信固定；旧 profile 不自动改写；项目真实兼容性另验 |
| 共享服务 | MySQL/Redis/MinIO 分配、existing 验证、owner/binding/依赖排序 | 无本轮数据库实机；未知产品须真实版本适配；没有万能数据库备份/恢复 |
| 升级/回滚/迁移 | 新 spec、固定版本、显式主机操作、跨机排序、逐步回执 | 没有隐式停机零损失承诺；没有自动生成任意项目迁移脚本 |
| 清理 | 只读诊断、cache/log 隔离、精确回执受控 purge | 不普遍删除 Windows/Linux 任意系统垃圾；不 drop_caches 或 prune volume |
| 网络来源 | 完整 commit 的 Git 获取；HTTPS 样本哈希镜像测量 | 显式网络批准；本轮未连接公网，未验证 2026 最新厂商说明 |
| 双边记录 | 版本/时间/路径/步骤、真实明文、本地配置镜像、双边 SHA256门 | 不自动备份全部远端业务数据；实际密钥/密码由用户登记或批准分配 |

无数据销毁、通用跨账户 Windows 服务、无凭据 SSH 自动登录、未知产品自动安装、无人审核安装脚本、自动数据库全量恢复功能。这些能力不能靠让 Agent 绕过执行器直接运行命令来冒充。

自定义 host command 的声明写集用于审核和记录，并非内核级系统调用沙箱；管理员批准的是实际 argv/脚本内容和作用范围。托管 APP 必须额外核实真实持久化参数，systemd/只读容器根加强约束，但不对不受信任代码作安全保证。
