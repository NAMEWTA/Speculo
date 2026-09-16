---
id: ops/host-manage
type: workflow-entry
workflow: ops
name: 主机环境与治理
description: 盘点本地或 SSH 主机，按批准计划准备环境、恢复默认并治理缓存日志。
keywords: [ops, host-manage, 主机, 持久化, 审批]
---

# 主机环境与治理

激活本 Work 后先读取 `<Path>{roots.workflows}/ops/README.md</Path>`。

## 读取范围

读取 `<Path>{roots.workflows}/ops/common/rules/activation-and-memory.md</Path>`，按当前主机/项目/部署 ID 定位最小证据。只因冲突、unknown、权限或迁移安全需要扩读，不默认遍历全域明文。

## 流程与完成标准

指定 local 或 SSH 的稳定 host_id；读取最近盘点与有限问题证据。初次 SSH 用用户已验证的 known_hosts，identity=discover 只允许只读探测；把返回身份明确登记后才允许计划和执行。

Linux SSH 目标若没有 Node：必须先 `ops.mjs bootstrap-node`（控制端校验已审核 tar 的 SHA256，scp 到目标，远端 POSIX 展开固定 Volta/Node），禁止把 POSIX 盘点只写在对话里。引导成功后必须 `ops.mjs enroll`（或 `register` 再 `probe --host`），`hosts/{host_id}/inventory/snapshot-*.json` 与 `status.json.hosts` 是完成标准的一部分。引导是 ops.mjs 第一阶段通道，需要明文 ack 与 SHA256，不走 plan/approve；已有 Node 的目标不重复安装、不改 `.bashrc`/`.profile`。缺 Node 只能阻塞 apply，不能阻塞登记。本轮仅 Linux SSH；Windows/macOS 仍要求目标已有 Node。


区分系统版本、用户默认、项目 pin、服务环境。environment-spec 支持明确版本的 uv、Volta、SDKMAN 管理配方；管理器缺失先用经过审核的安装器。保留旧默认与旧目录，不能为统一外观先删除旧环境。工作流不擅自改写用户 shell profile；激活新管理器入口是另一个明确的准备动作。

Docker 缺失使用经审核且版本固定的 Linux Engine 安装配方，完成服务、Compose、data-root、账号权限验证之后才进入 D。既有 data-root 不匹配时单独备份、停机、迁移、验证，不把 /var/lib/docker 直接 mv 当作安装步骤。镜像源按可信清单、样本哈希和目标网络测试，切换配置仍需批准。

诊断磁盘/内存和工具失败；禁止默认清内存、杀未知进程、关闭 swap/pagefile 或 prune 卷。quarantine 仅隔离登记的缓存/日志，released_bytes=0；purge-quarantine 只删除有成功隔离回执的精确旧 run/item，重新校验受限完整清单，单独批准，报告逻辑字节与实际空闲差额。

主机维护影响现存 APP/公共服务消费者时必须明确 acknowledged_consumers。完整计划列出下载、系统控制文件、服务重启、默认恢复和验证；执行通过后刷新主机双边记录。

`write-control` 精确绝对路径例外：内置 `/etc/docker/daemon.json` 与 `/etc/systemd/system/ops-*.service`；经审批还可声明 nginx conf.d、wireguard 配置、以及非 `ops-` 前缀的 systemd 单元。声明路径必须带理由、回滚说明和事后验证，不是任意 `/etc` 写权限。`sshd`/`docker`/`containerd` 等核心单元拒绝。业务数据路径没有该例外。

主机级入口（WireGuard、Nginx、探测页）写入 `resource_updates.hosts[].host_services`，生成器输出 `knowledge/host-services.json` 并进入服务一览表。跨主机公网入口写入 spec `public_ingress`，生成 `knowledge/public-ingress.json` 与「公网访问内网」章节。这些不是假的 APP 部署。`write-file` 不得覆盖生成器负责的 `README.md` / `DEPLOYMENTS.md` / `knowledge/host-services.json` / `knowledge/public-ingress.json` / `knowledge/INDEX.md`。

命令合同：`<Path>{roots.workflows}/ops/common/USAGE.md</Path>`；所有执行通过 ops.mjs，不能绕过计划审批直接拼接命令调用主机。
