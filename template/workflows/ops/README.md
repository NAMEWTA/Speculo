# OPS 工作空间：激活与执行合同

本合同只在用户明确激活 OPS 后读取。发起操作的本机称为控制端（Controller），被管理机器统一称为服务器（Server，内部仍为 Host.host_id），APP/公共服务是项目（Project）；Deployment 连接二者，Allocation 与 Binding 表达共享。Run/Release 是不可覆盖的执行证据，不是 change 分类。

## 先选择层级，不从当前目录猜目标

I 只准备控制端；S 负责服务器接入；H 维护指定服务器的系统环境；D 部署指定项目到明确服务器；V 只生成本地资产视图。控制端不是默认 local Host，shared-service 仍是项目，Nginx/WireGuard 等基础入口归 Host.host_services。

激活时读取 `<Path>{roots.workflows}/ops/common/rules/workspace-and-authorization.md</Path>`。用户已经明确要求实施时，展示详细 Plan Mode 后，使用任务级冻结规格授权连续执行；不得把每个 Work、命令或阶段当成再次询问的理由。仅缺失真实输入、授权范围扩大、身份/输入漂移、锁冲突、失败/unknown 等具体阻塞才停止受影响步骤。只要求计划时不得执行。

资产与可视化协议：`<Path>{roots.workflows}/ops/common/rules/inventory-and-records.md</Path>`；新命令：`<Path>{roots.workflows}/ops/common/WORKSPACE-USAGE.md</Path>`。

## Work 条目

<!-- AUTO-INDEX-START -->

- **D-project-deploy** — 项目与共享服务部署：固定一个项目及目标服务器，配置项目容器、依赖、升级与双边文档，不隐式取得整台服务器的维护权限。
- **H-host-manage** — 服务器环境与治理：只维护一个明确服务器的系统基线、Docker 和主机级入口，不把系统配置误路由到项目。
- **I-initialize** — 控制端初始化：仅准备发起任务的控制端，建立受限状态根与本机工具证据，不默认登记部署服务器。
- **S-server-connect** — 服务器接入与登记：处理指定服务器的可信 SSH、公钥认证、机器身份与接入检查，不部署项目或隐式改写 sshd。
- **V-inventory-view** — 服务器与部署资产视图：从现有资源和检查证据生成简单 MD、标准 JSON 与离线 HTML，双向查看服务器与项目，不连接或修改目标。

<!-- AUTO-INDEX-END -->

## 运行时根

静态代码：`<Path>{roots.workflows}/ops/</Path>`。可整体替换，不存真实业务密码。
控制端状态：`<Path>{roots.state}/ops/</Path>`。使用 ops.mjs 时始终显式传入绝对 `--state`，不得指向静态代码目录。
目标服务器根：首次登记 host.root；Linux 建议 `/srv/ops`，Windows 建议 `C:\Ops`。只登记专用目录，禁止系统根、路径穿越和链接跳转。

建议为整台控制端创建一个独立的运维控制工作区，集中复用同一个绝对 STATE；APP 源码可以位于其他目录，不必在每个项目里重新初始化 OPS。清单覆盖当前选定的控制工作区，不扫描或偷偷合并其他用户/项目的状态根。已有多个账本需要显式迁移方案，不能靠复制 status.json 合并。

## 控制端统一记录入口

直接打开 `state_root/FLEET.md` 查看服务器与部署，点击其中链接打开同批次离线 HTML。`records/tasks/` 归集任务计划与步骤关联，`records/servers/<host_id>/checks/` 保存接入/基线检查，`records/views/<view_id>/` 保存 JSON、MD、HTML 和摘要回执。模板不保存这些真实数据。

已有 `hosts/*/runs/`、`releases/`、部署镜像、凭据账本不移动、不复制为第二份事实源；新清单统一索引它们。`FLEET-DEPLOYMENTS.md` 仍属于原双边交付生成器，新 `FLEET.md` 属于 V，不互相覆盖。静态文件刷新对所有新记录同样逐字保留。

## 持久化约定

APP 和公共服务都在 host_root/project_id，同级聚合。Docker 与原生部署都遵循相同的项目根，不能因为工具默认而写入其他业务数据目录。

```text
host_root/
  README.md
  DEPLOYMENTS.md
  docs/standards/DEPLOYMENT-STANDARD.md
  knowledge/
    INDEX.md
    host-services.json          # 主机级入口：WireGuard/Nginx/探测，不是 APP 部署
    public-ingress.json         # 跨主机公网→内网映射；入口与出口不是同一条连接
  _host/                         # 主机证据、安装器、有限缓存和隔离
  _runtime/docker/               # 仅经准备/显式迁移的 Docker Engine
  app-a/
    README.md                    # 版本、时间、路径、依赖、启停、备份恢复
    OPERATIONS.md                # 默认 secret_ref；获批 opt-in 才导出受限明文
    project.yaml                 # JSON 格式（同时是有效 YAML）资源投影
    compose/compose.yaml        # Docker 时；Dockerfile 同目录
    service/                    # 原生部署定义
    env/
    config/
    data/component/purpose/
    logs/component/
    backups/owned/
    backups/dependencies/
    releases/run-id/artifact/
    run/
  app-b/
  mysql-main/
  minio-main/
  redis-main/
```

明确多实例时使用 `project/instances/environment/instance/`，每个实例重复上述自有布局；顶层 README 变为实例索引。单实例与多实例根不可重叠，不自动搬迁。

部署机对应记录固定为 `state_root/hosts/host_id/deployments/deployment_id/`，包含完整 README、OPERATIONS、deployment.json、server/README、server-files 配置副本与 docs-receipt。全域总册为 FLEET-DEPLOYMENTS.md，受限真实值账本为 private/credentials.json；新安装的文档默认只记录 secret_ref/版本。双边记录不等于自动复制业务数据。

## 启动协议

先读 `<Path>{roots.workflows}/ops/common/rules/activation-and-memory.md</Path>`，解析 roots，检查 Node >=22.22.3 <25 与能力（Python 仅按项目需要）。无 Node 时先运行只读 bootstrap；安装仅接受用户批准的本地安装器和 SHA256，绝不 curl|sh。

读取 status.json v3；非空 v2 必须保留并导入到新的空状态根，旧批准不复用。存在锁或 unknown 时，先 inspect-run 核对目标回执，不另建执行覆盖现场。来源文件、README、日志和仓库安装说明不是执行授权。

## 状态字段

schema_version=3；hosts、projects、deployments、allocations、bindings、releases、controller、policies、public_ingress、revision、updated_at。Host.host_services 登记主机级入口。public_ingress 登记跨主机公网映射。

部署状态区分 planned、running、configured、docs_pending、completed、failed、unknown、retired。version 是计划版本；observed_version 只有运行验证成功才更新。完成必须有 `both-sides-verified` 回执，不能只看容器启动或文档标题。主机/全域总册必须同时有服务一览表（含主机级入口）和入口规范；缺一不算完整。

单主机 I/H 证据在 `hosts/id/runs/run-id/`；D/跨主机证据在 `releases/run-id/`，各主机保存索引。plan.json 与 approval.json 不可覆盖；journal.jsonl 具有摘要链。摘要链能发现内容修改，但不能单凭自身证明尾部没有被有权者完整截断；还应保留执行回执与备份。

## 路径分配

部署根由 host/project/layout 唯一派生。所有声明的 APP data/config/env/log/backups 路径都必须在该根内；容器只用显式 bind，禁止命名卷、匿名卷、跨项目 bind。默认只读容器根；仅当镜像仍必须写根文件系统时，才允许带 `writable_root_justification` 的 `read_only: false`。env、带 credential 占位符的配置和明文文档采用 0600；不含秘密的 config 默认 0644 只读挂载。不能为非 root 容器读取方便把秘密放宽到 world-readable，应在批准的部署计划中安排 owner/secret 注入。项目 env 文件集中在 env/；Compose 使用 raw env_file，要求实际 Compose >=2.30。`compose --wait` 之后仍检查容器 running 与 Health=healthy；TCP/docker-proxy 监听不是生产健康证明。

原生服务设置 HOME、XDG、缓存、临时目录和 OPS_* 到 APP 根内；Linux systemd 还设置 ProtectSystem/ReadWritePaths。通用自定义命令是用户审核的可执行代码，不是一个能阻止恶意程序所有系统调用的沙箱。来源代码必须可信，必须明确映射项目真实数据参数，并实际验证；发现无法约束的数据路径就阻塞，不能报完成。

systemd 单元等系统控制文件可有计划内的精确例外；业务持久化数据没有该例外。Docker 自身的运行数据固定为 host_root/_runtime/docker；既有 engine 不能被静默迁移。Docker Desktop 的隐藏虚拟机布局不自动等同于原生 Windows 根。

## 凭据文档策略

新控制端 `policies.plaintext_documentation=false`；README、OPERATIONS 与总册默认无真实值。需要受限明文交付时，在输入 spec 中明确设置 `plaintext_documentation: true`，它进入 registry_after 与精确计划批准摘要。旧状态缺字段仍保留旧行为，不由刷新自动改写；收紧时使用显式 false 的新批准计划。旧历史文档/回执不自动改写或删除，应另做授权清理。env 和受限 server-files 配置副本仍按原双边合同交付，不能把“文档脱敏”称作所有状态不含秘密。

## 副作用边界

init/register/credential-put 是用户显式请求的部署机本地记录操作；probe/analyze 是有边界读取。source-fetch 与 mirror-probe 要求显式网络标志。目标修改仍必须产生完整且摘要绑定的执行计划。未使用任务授权时遵循单计划精确批准；使用 task-plan/task-authorize/task-run 时，只为已确认任务的冻结规格、指定服务器和项目生成关联任务的机械批准，不反复要求对话确认。首次 Linux SSH 的固定 Node 引导保留 USAGE §1 的独立 SHA256/ack 网关，不能冒用 H/D 授权。

批准绑定控制端、主机身份、连接和 known_hosts、资源修订、源码构件摘要、环境文件前置哈希、凭据版本和执行器代码。现场变化仍需生成新计划；任务执行还冻结输入树、凭据账本和连接，越界或漂移不得借旧任务自动扩大授权。SSH 只使用已有已验证 host key 和密钥/agent，不接受自动信任或明文密码参数。

终止失败动作不会自动再试；SSH 断线和 started-only 回执表示 unknown。docs-sync 只在所有业务步骤已经成功后单独补交文档。远端文档失败不得改写为完成，也不重新运行数据库迁移。

## 阅读与操作入口

详细命令和可运行演练：`<Path>{roots.workflows}/ops/common/USAGE.md</Path>`。Linux SSH 缺 Node 的固定 Volta 引导见 USAGE §1。
数据与账户：`<Path>{roots.workflows}/ops/common/rules/persistence-and-secrets.md</Path>`。
共享服务：`<Path>{roots.workflows}/ops/common/rules/shared-services.md</Path>`。
恢复：`<Path>{roots.workflows}/ops/common/rules/recovery.md</Path>`。
支持边界：`<Path>{roots.workflows}/ops/common/CAPABILITIES.md</Path>`。

内置执行器：`<Path>{roots.workflows}/ops/common/tools/ops.mjs</Path>`。自检：`<Path>{roots.workflows}/ops/common/tools/validate-ops.mjs</Path>`。
