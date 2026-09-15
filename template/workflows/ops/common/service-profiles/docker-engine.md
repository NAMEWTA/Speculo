# Linux Docker Engine 准备合同

本版不从互联网猜最新安装命令。先读取真实发行版、架构、已有 Engine/Compose、用户和配置。缺失时由用户/Agent提供固定版本的可信安装器与包清单，安装器本地文件哈希进入计划，禁止直接执行未校验 curl 输出。

使用 H host_actions：将安装器写入 `_host/installers/<version>/`；install-toolchain 明示系统包文件/服务动作、当前默认版本与验证；write-control 合并 `/etc/docker/daemon.json`，data-root 必须是已登记 `host_root/_runtime/docker`；之后明确 restart/start、info、compose version 和权限检查。已有配置不能直接覆盖成仅含 data-root 的文件；先保存、合并并复核差异。

已有数据：生成独立维护计划，列所有容器/消费者，验证一致备份，停机，保留旧目录，显式复制/校验/切换/启动/验证。不能“为了规范”直接删除 /var/lib/docker。Rootless 有不同 daemon/config 权限，需显式适配，不冒充 rootful。

Docker Desktop 和隐藏 VM 不能通过在 Windows 创建 C:\Ops\_runtime\docker 就满足真实根；严格模式不接受这类假配置。使用实际 Linux/WSL Engine 主机，或先实施并验证对应平台 adapter。

D 会读取 daemon ID/context/endpoint/data-root/Compose 版本，固定实际 daemon，只接受 unix/npipe 本机端点，拒绝 remote context 偷连另一台机器。容器镜像必须 image@sha256，Compose>=2.30，根文件系统只读，全部业务数据显式 bind。
