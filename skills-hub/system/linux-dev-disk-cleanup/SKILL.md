---
name: linux-dev-disk-cleanup
description: 审计 Linux 开发机磁盘，并在具名授权后清理 APT、journal、snap 旧修订、Docker 未使用数据和可重建缓存。用于根分区空间、缓存体积和 /linux-dev-disk-cleanup；不处理 Windows、仅查 CPU、区域、代理或 Clash。
license: MIT
compatibility: Requires systemd Linux on the actual target, commonly Ubuntu or Debian. Root is required only for authorized steps that need it.
metadata:
  author: NAMEWTA
  wta-format-reviewed: '2026-10-08'
---
# Linux 开发机磁盘清理

## 输入与输出契约

确认目标是 systemd Linux 主机，而不是 WSL 里看到的 Windows 盘、容器内部或远程跳板。取得根分区基线和当前清理清单；每项具有确切路径、容器名、volume ID、snap 修订或官方缓存命令，以及所有者、估计大小、决定和状态。扫描发现候选不自动新增删除授权。

清单逐项写估计占用、批准动作、执行/停止/保留状态、`df` 实测变化，以及运行中容器、业务数据目录、当前内核和回退内核的核对。目录 `du` 之和不能冒充释放量。

示例：“仅审计这台 Ubuntu 的根分区，列出可清理项目让我确认。”应进入本技能；“清理 Windows 的 C 盘缓存。”或“只看哪个进程占 CPU。”不应由本技能接管。

Docker、snap 或 APT 不存在时跳过对应项。需要 root 的步骤先确认权限，审计不自动提权。测量和命令见 [清理工作流](references/linux-cleanup-workflow.md)。本入口的授权与停止条件优先于参考中的示例命令。

在用户工作区的 `清理清单.md` 或指定文件记录稳定编号和历史；不能因重新扫描覆盖已有决定。

## 审计与授权

只读或规划请求不删除、不清缓存、不 prune、不卸载、不改 journald。已有具名批准可执行，新候选继续待确认。“磁盘优化一下”不授权破坏性操作。

开始前重测 `df -h /` 与 `df -ih /`。overlay 和 loop 与根分区是同一块盘，不相加。`du` 使用 `-x`，不跟随其他挂载。

## 执行

操作前重读路径、所有权和清单。先处理清单点名的过期临时目录，再处理 Docker。Docker 顺序固定：点名且非 running 的容器、`docker volume prune`、`docker image prune -a`、`docker builder prune`。不运行 `docker system prune -a --volumes`，不把 `docker volume prune` 放进定时任务。

语言和构建缓存只用该工具的官方清理命令。`node_modules`、工具链、会话目录和业务 bind mount 各自独立决定。不从家目录或仓库根递归删除 `dist`、`build`、`node_modules`、`.next`。

留下当前内核和至少一个已安装的回退内核。`apt autoremove` 先 dry-run；列表含回退内核、桌面或运行时则不执行。snap 只删除带 disabled 标记的修订，并且必须带 `--revision`。journal 上限和 vacuum 只有清单写明才改。

父目录里还有未点名内容、在用 volume 会消失、dry-run 与保留项冲突，或现场与清单矛盾时，停止受影响项。不删除 `/tmp`、`/var/tmp` 本身，也不删除 `systemd-private-*`。

## 验收

按阶段读回根分区可用空间。核对运行中容器的名单与健康、点名数据目录大小、`uname -r` 与回退内核、源码仍在且生成目录已空。成功、失败、保留和硬停写入清单。只清理本轮自行创建且不再需要的临时文件，保留清单与证据。
