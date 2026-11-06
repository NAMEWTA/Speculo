---
name: linux-dev-disk-cleanup
description: 审计 Linux 开发机磁盘，并清理用户指定的缓存、旧软件或未使用的开发资源。
license: MIT
---

# Linux 磁盘清理

先确认真实主机、目标分区与请求范围。仅审计时不删除、不 prune、不卸载、不修改服务；已有具名清理授权继续有效，新发现的对象单独提出。
用 `df -h` / `df -ih` 建立空间与 inode 基线，目录扫描使用 `du -x`，不要重复计算 overlay/loop 或跨挂载内容。

按需要读取 [平台命令与数据边界](references/linux-cleanup-workflow.md)。APT、snap 或 Docker 不存在时跳过，不为清理安装它们。
保留一份简短清单即可：实际对象、占用、处理决定与结果。不要为每个动作生成流程状态文件。

- 优先工具自身的清理/卸载命令，不从用户家目录递归删除 `dist`、`build` 或 `node_modules`。
- Docker 先核对容器状态、volume 与 bind mount 的数据用途；只能清理批准范围内的未使用资源。禁止以 `docker system prune -a --volumes` 代替判断。
- `apt autoremove` 先预览，保留当前内核及至少一个已安装的回退内核；不要移除仍需要的桌面或运行时。
- snap 只处理指定的 disabled 修订并带 `--revision`；journal 上限与 vacuum 按请求范围操作。
- 不删除 `/tmp`、`/var/tmp` 本身或 `systemd-private-*`，不删除活动进程依赖的内容。

执行前核对对象身份与用途。现场与清单不符、可能丢业务数据或保留依赖会被删时，停止受影响项并说明。
用分区实际空间变化验证结果，不能把目录估算相加冒充释放量。检查相关容器、保留工具和项目仍可用，报告失败与保留项。
