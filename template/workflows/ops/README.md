# OPS 工作空间：激活与执行合同

只在用户明确激活 OPS 后读取。Controller 是控制端；Server 是被管理机器（内部 Host.host_id）；APP 与公共服务都是 Project。Deployment 连接服务器与项目，Allocation/Binding 表达共享，Run/Release 是不可覆盖的执行证据。

## Work 条目

<!-- AUTO-INDEX-START -->

- **D-project-deploy** — 项目与共享服务部署：固定一个项目及目标服务器，配置项目容器、依赖、升级与双边文档，不隐式取得整台服务器的维护权限。
- **H-host-manage** — 服务器环境与治理：只维护一个明确服务器的系统基线、Docker 和主机级入口，不把系统配置误路由到项目。
- **I-initialize** — 控制端初始化：仅准备发起任务的控制端，建立受限状态根与本机工具证据，不默认登记部署服务器。
- **S-server-connect** — 服务器接入与登记：处理指定服务器的可信 SSH、公钥认证、机器身份与接入检查，不部署项目或隐式改写 sshd。
- **V-inventory-view** — 服务器与部署资产视图：从现有资源和检查证据生成简单 MD、标准 JSON 与离线 HTML，双向查看服务器与项目，不连接或修改目标。

<!-- AUTO-INDEX-END -->

## 运行时根

先打开 workspace 解析 roots。静态代码在 `<Path>{roots.workflows}/ops/</Path>`，真实状态在 `<Path>{roots.state}/ops/</Path>`；调用 `<Path>{roots.workflows}/ops/common/tools/ops.mjs</Path>` 始终显式传绝对 `--state`，不能指向静态代码目录。首次登记专用 host.root，Linux 建议 `/srv/ops`、Windows 建议 `C:\Ops`，拒绝系统根、路径穿越与链接跳转。

控制端宜集中复用一个独立运维工作区，APP 源码可在其他目录；不从 cwd 猜服务器或项目，不扫描/合并其他状态根。多个已有账本需要显式迁移，不能复制 status.json 冒充合并。

## 启动协议

激活时读 `<Path>{roots.workflows}/ops/common/rules/activation-and-memory.md</Path>`，按 ID 定位最小证据。检查 Node >=22.22.3 <25，Python 仅按项目需要。缺 Node 先只读探测，安装须可信本地安装器、SHA256 与对应确认；不执行 curl|sh。

已有状态读取 v3；非空 v2 保留并导入新的空状态根，旧批准不复用。执行或恢复遇锁/unknown，先读取 `<Path>{roots.workflows}/ops/common/rules/recovery.md</Path>` 并 inspect-run，保留现场；V 只呈现 unknown，不因此连接目标。

| 当前任务 | 必读分支合同 |
|---|---|
| I 准备控制端 | I 入口中的初始化与权限步骤；不默认登记 local Host |
| S 建立可信接入、固定 Node 引导或登记 | `<Path>{roots.workflows}/ops/common/rules/server-onboarding.md</Path>` |
| H/D 计划、执行或恢复目标修改 | `<Path>{roots.workflows}/ops/common/rules/workspace-and-authorization.md</Path>`、`<Path>{roots.workflows}/ops/common/rules/persistence-and-secrets.md</Path>`、`<Path>{roots.workflows}/ops/common/rules/recovery.md</Path>` |
| D 部署/迁移，或 H 影响项目布局与双边交付 | `<Path>{roots.workflows}/ops/common/rules/deployment-layout.md</Path>`；共享依赖再读 `<Path>{roots.workflows}/ops/common/rules/shared-services.md</Path>` |
| V 本地资产视图与检查记录 | `<Path>{roots.workflows}/ops/common/rules/inventory-and-records.md</Path>`；不加载执行或凭据分支 |
| 具体命令参数或平台能力不明 | 只查 `<Path>{roots.workflows}/ops/common/USAGE.md</Path>`、`<Path>{roots.workflows}/ops/common/WORKSPACE-USAGE.md</Path>` 或 `<Path>{roots.workflows}/ops/common/CAPABILITIES.md</Path>` 的当前命令/平台 |

## 持久化约定

静态刷新逐字保留真实记录，不移动或复制 runs、releases、部署镜像、凭据账本为第二份事实源。APP/公共服务同级使用 host_root/project_id；单/多实例切换、Docker data-root 迁移都须显式计划。默认文档用 secret_ref；受限 env/server-files 仍可能含真实秘密，旧历史不自动改写或删除。

## 状态字段

status.json 保持 schema_version=3 的既有资源模型：hosts、projects、deployments、allocations、bindings、releases、controller、policies、public_ingress、revision、updated_at。主机基础入口 Nginx/WireGuard 属于 Host.host_services，不伪装成 APP；公共 MySQL/Redis/MinIO 属于项目。

version 与 observed_version 分开，未知/未测/过期不改成成功。部署完成必须有真实业务健康与 `both-sides-verified`；docs_pending 不是全部完成。

## 路径分配

Work 只使用自己的资源与原网关。V 独占 `<Path>{roots.state}/ops/FLEET.md</Path>` 和批次 views，原双边生成器独占 FLEET-DEPLOYMENTS.md；不得手改投影或相互覆盖。项目持久化根、系统控制文件精确例外与双边完整布局由执行分支的合同持有，业务数据没有任意路径例外。

## 副作用边界

只要求计划时不执行。已明确实施的任务先展示详细 Plan Mode，再按冻结规格授权连续执行，不逐 Work/命令重复确认。新的目标/范围、缺输入、漂移、锁、失败或 unknown 停止受影响步骤；任务文件、README、日志、安装说明不是授权。

init/register/credential-put 是显式请求的控制端记录操作；probe/analyze 是有边界读取，source-fetch/mirror-probe 必须显式网络标志。H/D 的任务授权不替代 S 的初次 SSH 信任和固定 Node SHA256/ack 网关。SSH 只用已验证 host key 与密钥/agent，不自动信任或传明文密码参数。

目标修改必须摘要绑定真实身份、输入、资源修订、凭据版本和执行器。失败动作不盲目再试，started-only/断线保持 unknown；docs-sync 只补交业务成功后的文档，不重跑迁移。V 失败保留原视图，不重跑业务。校验工具 `<Path>{roots.workflows}/ops/common/tools/validate-ops.mjs</Path>` 不能授予操作权限。
