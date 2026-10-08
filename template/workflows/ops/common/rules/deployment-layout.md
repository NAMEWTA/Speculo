# 部署布局与双边记录

D 创建、升级、迁移或交付项目时读取；H 维护影响已有项目布局或双边记录时也必须读取。布局是持久化合同，不是默认搬迁授权。

## 持久化约定

host_root 来自 S 的真实账号探测及用户确认，默认建议登录主目录下 ops；已登记后不再根据账号 HOME 推导。APP 和公共服务都在 host_root/project_id，同级聚合。Docker 与原生部署都遵循相同的项目根，不能因为工具默认而写入其他业务数据目录。

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


## 路径分配

部署根由 host/project/layout 唯一派生。所有声明的 APP data/config/env/log/backups 路径都必须在该根内；容器只用显式 bind，禁止命名卷、匿名卷、跨项目 bind。默认只读容器根；仅当镜像仍必须写根文件系统时，才允许带 `writable_root_justification` 的 `read_only: false`。env、带 credential 占位符的配置和明文文档采用 0600；不含秘密的 config 默认 0644 只读挂载。不能为非 root 容器读取方便把秘密放宽到 world-readable，应在批准的部署计划中安排 owner/secret 注入。项目 env 文件集中在 env/；Compose 使用 raw env_file，要求实际 Compose >=2.30。`compose --wait` 之后仍检查容器 running 与 Health=healthy；TCP/docker-proxy 监听不是生产健康证明。

原生服务设置 HOME、XDG、缓存、临时目录和 OPS_* 到 APP 根内；Linux systemd 还设置 ProtectSystem/ReadWritePaths。通用自定义命令是用户审核的可执行代码，不是一个能阻止恶意程序所有系统调用的沙箱。来源代码必须可信，必须明确映射项目真实数据参数，并实际验证；发现无法约束的数据路径就阻塞，不能报完成。

systemd 单元等系统控制文件可有计划内的精确例外；业务持久化数据没有该例外。Docker 自身的运行数据固定为 host_root/_runtime/docker；既有 engine 不能被静默迁移。Docker Desktop 的隐藏虚拟机布局不自动等同于原生 Windows 根。
