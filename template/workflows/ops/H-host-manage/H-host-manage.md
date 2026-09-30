---
id: ops/host-manage
type: workflow-entry
workflow: ops
name: 服务器环境与治理
description: 只维护一个明确服务器的系统基线、Docker 和主机级入口，不把系统配置误路由到项目。
keywords: [ops, host-manage, 服务器, 持久化, 明确范围]
---

# 服务器环境与治理

激活本 Work 后先读取 `<Path>{roots.workflows}/ops/README.md</Path>`。

## 读取范围

读取 `<Path>{roots.workflows}/ops/common/rules/activation-and-memory.md</Path>` 与 `<Path>{roots.workflows}/ops/common/rules/workspace-and-authorization.md</Path>`，按当前服务器/项目/部署/任务 ID 定位最小证据。只因冲突、unknown、权限或迁移安全需要扩读，不默认遍历全域明文。

## 流程与完成标准

指定 local 或 SSH 的稳定 host_id（用户侧称 server_id）；读取最近盘点与有限问题证据。未登记/尚未验证 SSH 接入时先路由 S，不从当前项目目录猜测服务器。

Linux SSH 目标若没有 Node：必须先通过 S 执行 `ops.mjs bootstrap-node`（控制端校验已审核 tar 的 SHA256，scp 到目标，远端 POSIX 展开固定 Volta/Node），禁止把 POSIX 盘点只写在对话里。引导成功后必须 `ops.mjs enroll`（或 `register` 再 `probe --host`），`hosts/{host_id}/inventory/snapshot-*.json` 与 `status.json.hosts` 是完成标准的一部分。引导是 ops.mjs 第一阶段通道，需要明文 ack 与 SHA256，不走 plan/approve；已有 Node 的目标不重复安装、不改 `.bashrc`/`.profile`。缺 Node 只能阻塞 apply，不能阻塞登记。本轮仅 Linux SSH；Windows/macOS 仍要求目标已有 Node。

区分系统版本、用户默认、项目 pin、服务环境。environment-spec 支持明确版本的 uv、Volta、SDKMAN 管理配方；管理器缺失先用经过审核的安装器。保留旧默认与旧目录，不能为统一外观先删除旧环境。工作流不擅自改写用户 shell profile；激活新管理器入口是另一个明确的准备动作。

Docker 缺失使用经审核且版本固定的 Linux Engine 安装配方，完成服务、Compose、data-root、账号权限验证之后才进入 D。既有 data-root 不匹配时单独备份、停机、迁移、验证，不把 /var/lib/docker 直接 mv 当作安装步骤。镜像源按可信清单、样本哈希和目标网络测试，切换配置仍需批准。

诊断磁盘/内存和工具失败；禁止默认清内存、杀未知进程、关闭 swap/pagefile 或 prune 卷。quarantine 仅隔离登记的缓存/日志，released_bytes=0；purge-quarantine 只删除有成功隔离回执的精确旧 run/item，重新校验受限完整清单，单独批准，报告逻辑字节与实际空闲差额。

服务器维护影响现存 APP/公共服务消费者时必须明确 acknowledged_consumers；任务授权还需写出 related_project_ids 与相关 server_ids。完整计划列出下载、系统控制文件、服务重启、默认恢复和验证；在已确认任务中顺序执行，不逐条重复询问。执行通过后刷新主机双边记录。

`write-control` 精确绝对路径例外：内置 `/etc/docker/daemon.json` 与 `/etc/systemd/system/ops-*.service`；经审批还可声明 nginx conf.d、wireguard 配置、以及非 `ops-` 前缀的 systemd 单元。声明路径必须带理由、回滚说明和事后验证，不是任意 `/etc` 写权限。`sshd`/`docker`/`containerd` 等核心单元拒绝。业务数据路径没有该例外。

主机级入口（WireGuard、Nginx、探测页）写入 `resource_updates.hosts[].host_services`，生成器输出 `knowledge/host-services.json` 并进入服务一览表。跨主机公网入口写入 spec `public_ingress`，生成 `knowledge/public-ingress.json` 与「公网访问内网」章节。这些不是假的 APP 部署。`write-file` 不得覆盖生成器负责的 `README.md` / `DEPLOYMENTS.md` / `knowledge/host-services.json` / `knowledge/public-ingress.json` / `knowledge/INDEX.md`。

完成后执行 server-check 的需求对应 profile 并保留未测项，再用 V 刷新清单。检查结果不替代双边回执或项目业务健康。

命令合同：`<Path>{roots.workflows}/ops/common/USAGE.md</Path>` 与 `<Path>{roots.workflows}/ops/common/WORKSPACE-USAGE.md</Path>`；执行只通过现有 ops.mjs 网关及明确新增的任务命令，不绕过授权直接拼接目标修改命令。
