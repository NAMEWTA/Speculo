# 主机维护分支

只读取当前 H 任务命中的章节；多个 profile 的依赖必须全部过门，不因按需读取省掉适用检查。

## 最小初始化

读取 <Path>{roots.workflows}/ops/common/rules/host-root-and-onboarding.md</Path>。server-initialize-spec 只生成缺少目录的 mkdir 规格并交付原生成器文档；不安装 Docker、不迁移已有数据、不修改账号默认环境。重复检查复用已有目录，任何文件类型、权限或 owner 冲突停止受影响步骤。

## 工具环境

区分系统版本、用户默认、项目 pin、服务环境。environment-spec 支持明确版本的 uv、Volta、SDKMAN 管理配方；管理器缺失先用经过审核的安装器。保留旧默认与旧目录，不能为统一外观先删除旧环境。工作流不擅自改写用户 shell profile；激活新管理器入口是另一个明确的准备动作。

## Docker 与镜像源

Docker 缺失使用经审核且版本固定的 Linux Engine 安装配方，完成服务、Compose、data-root、账号权限验证之后才进入 D。既有 data-root 不匹配时单独备份、停机、迁移、验证，不把 /var/lib/docker 直接 mv 当作安装步骤。镜像源按可信清单、样本哈希和目标网络测试，切换配置仍需批准。

## 资源诊断、隔离与清理

诊断磁盘/内存和工具失败；禁止默认清内存、杀未知进程、关闭 swap/pagefile 或 prune 卷。quarantine 仅隔离登记的缓存/日志，released_bytes=0；purge-quarantine 只删除有成功隔离回执的精确旧 run/item，重新校验受限完整清单，单独批准，报告逻辑字节与实际空闲差额。

## 系统控制文件与入口

`write-control` 精确绝对路径例外：内置 `/etc/docker/daemon.json` 与 `/etc/systemd/system/ops-*.service`；经审批还可声明 nginx conf.d、wireguard 配置、以及非 `ops-` 前缀的 systemd 单元。声明路径必须带理由、回滚说明和事后验证，不是任意 `/etc` 写权限。`sshd`/`docker`/`containerd` 等核心单元拒绝。业务数据路径没有该例外。

主机级入口（WireGuard、Nginx、探测页）写入 `resource_updates.hosts[].host_services`，生成器输出 `knowledge/host-services.json` 并进入服务一览表。跨主机公网入口写入 spec `public_ingress`，生成 `knowledge/public-ingress.json` 与「公网访问内网」章节。这些不是假的 APP 部署。`write-file` 不得覆盖生成器负责的 `README.md` / `DEPLOYMENTS.md` / `knowledge/host-services.json` / `knowledge/public-ingress.json` / `knowledge/INDEX.md`。
