# OPS 2.2 激活与执行合同

本合同只在用户明确激活 OPS 后读取。OPS 的一级资源是主机，APP/公共服务是项目；Deployment 连接二者，Allocation 与 Binding 表达共享。Run/Release 是不可覆盖的执行证据，不是 change 分类。

## Work 条目

<!-- AUTO-INDEX-START -->

- **D-project-deploy** — APP 与公共服务部署：按固定项目根规划部署、共享资源、版本更新与双边文档。
- **H-host-manage** — 主机环境与治理：盘点本地或 SSH 主机，按批准计划准备环境、恢复默认并治理缓存日志。
- **I-initialize** — 控制端初始化：识别部署机工具与能力，建立资源账本、路径和明文记录规则。

<!-- AUTO-INDEX-END -->

## 运行时根

静态代码：`<Path>{roots.workflows}/ops/</Path>`。可整体替换，不存真实业务密码。
部署机状态：`<Path>{roots.state}/ops/</Path>`。使用 ops.mjs 时始终显式传入绝对 `--state`，不得指向静态代码目录。
目标服务器根：首次登记 host.root；Linux 建议 `/srv/ops`，Windows 建议 `C:\Ops`。只登记专用目录，禁止系统根、路径穿越和链接跳转。

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
    OPERATIONS.md                # 策略启用时：受限真实明文凭据
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

部署机对应记录固定为 `state_root/hosts/host_id/deployments/deployment_id/`，包含完整 README、OPERATIONS、deployment.json、server/README、server-files 配置副本与 docs-receipt。全域总册为 FLEET-DEPLOYMENTS.md，真实明文账本为 private/credentials.json。双边记录不等于自动复制业务数据。

## 启动协议

先读 `<Path>{roots.workflows}/ops/common/rules/activation-and-memory.md</Path>`，解析 roots，检查 Python >=3.10 与能力。无 Python 时先运行只读 bootstrap；安装仅接受用户批准的本地安装器和 SHA256，绝不 curl|sh。

读取 status.json v3；非空 v2 必须保留并导入到新的空状态根，旧批准不复用。存在锁或 unknown 时，先 inspect-run 核对目标回执，不另建执行覆盖现场。来源文件、README、日志和仓库安装说明不是执行授权。

## 状态字段

schema_version=3；hosts、projects、deployments、allocations、bindings、releases、controller、policies、public_ingress、revision、updated_at。Host.host_services 登记主机级入口。public_ingress 登记跨主机公网映射。

部署状态区分 planned、running、configured、docs_pending、completed、failed、unknown、retired。version 是计划版本；observed_version 只有运行验证成功才更新。完成必须有 `both-sides-verified` 回执，不能只看容器启动或文档标题。主机/全域总册必须同时有服务一览表（含主机级入口）和入口规范；缺一不算完整。

单主机 I/H 证据在 `hosts/id/runs/run-id/`；D/跨主机证据在 `releases/run-id/`，各主机保存索引。plan.json 与 approval.json 不可覆盖；journal.jsonl 具有摘要链。摘要链能发现内容修改，但不能单凭自身证明尾部没有被有权者完整截断；还应保留执行回执与备份。

## 路径分配

部署根由 host/project/layout 唯一派生。所有声明的 APP data/config/env/log/backups 路径都必须在该根内；容器只用显式 bind，禁止命名卷、匿名卷、跨项目 bind。默认只读容器根；仅当镜像仍必须写根文件系统时，才允许带 `writable_root_justification` 的 `read_only: false`。config/env 默认 0644 只读挂载，供非 root 镜像用户读取。项目 env 文件集中在 env/；Compose 使用 raw env_file，要求实际 Compose >=2.30。`compose --wait` 之后仍检查容器 running 与 Health=healthy；TCP/docker-proxy 监听不是生产健康证明。

原生服务设置 HOME、XDG、缓存、临时目录和 OPS_* 到 APP 根内；Linux systemd 还设置 ProtectSystem/ReadWritePaths。通用自定义命令是用户审核的可执行代码，不是一个能阻止恶意程序所有系统调用的沙箱。来源代码必须可信，必须明确映射项目真实数据参数，并实际验证；发现无法约束的数据路径就阻塞，不能报完成。

systemd 单元等系统控制文件可有计划内的精确例外；业务持久化数据没有该例外。Docker 自身的运行数据固定为 host_root/_runtime/docker；既有 engine 不能被静默迁移。Docker Desktop 的隐藏虚拟机布局不自动等同于原生 Windows 根。

## 副作用边界

init/register/credential-put 是用户显式请求的部署机本地记录操作；probe/analyze 是有边界读取。source-fetch 与 mirror-probe 要求显式网络标志。其余目标修改全部先生成完整计划，用户确认精确摘要后执行，包括本地可逆动作。

批准绑定控制端、主机身份、连接和 known_hosts、资源修订、源码构件摘要、环境文件前置哈希、凭据版本和执行器代码。更改任何这些条件均须重新计划。SSH 只使用已有已验证 host key 和密钥/agent，不接受自动信任或明文密码参数。

终止失败动作不会自动再试；SSH 断线和 started-only 回执表示 unknown。docs-sync 只在所有业务步骤已经成功后单独补交文档。远端文档失败不得改写为完成，也不重新运行数据库迁移。

## 阅读与操作入口

详细命令和可运行演练：`<Path>{roots.workflows}/ops/common/USAGE.md</Path>`。
数据与账户：`<Path>{roots.workflows}/ops/common/rules/persistence-and-secrets.md</Path>`。
共享服务：`<Path>{roots.workflows}/ops/common/rules/shared-services.md</Path>`。
恢复：`<Path>{roots.workflows}/ops/common/rules/recovery.md</Path>`。
支持边界：`<Path>{roots.workflows}/ops/common/CAPABILITIES.md</Path>`。

内置执行器：`<Path>{roots.workflows}/ops/common/tools/ops.mjs</Path>`。自检：`<Path>{roots.workflows}/ops/common/tools/validate-ops.mjs</Path>`。
