---
name: windows-dev-disk-cleanup
description: 审计 Windows 开发机磁盘，并在具名授权后清理可重建缓存、旧应用或工具链。用于 C 盘空间、大文件与清理验收；不处理其他操作系统或一般性能调优。
license: MIT
compatibility: Requires native Windows and PowerShell on the actual target; specific servicing operations need separate administrator authorization.
metadata:
  author: NAMEWTA
  wta-format-reviewed: '2026-10-06'
---
# Windows 开发机磁盘清理

## 输入与输出契约

确认原生 Windows、目标卷和当前清理清单；每项具有准确路径/产品 ID、归属、保留依赖与状态。扫描发现候选不自动新增删除授权。

清单逐项写估计占用、批准动作、执行/锁定/保留状态、卷实际空间变化和工具链存活检查。删除不可逆时写明不可回滚，不用目录大小冒充释放量。

示例：“仅审计 C 盘空间，列出可清理项目让我确认。”应进入本技能；“清理 macOS 的开发缓存。”不应由本技能接管。

面向原生 Windows/PowerShell；先确认不是 WSL 或远程 Linux。部分系统动作需要管理员，审计不自动提权。阶段方法见 [清理工作流](references/windows-cleanup-workflow.md)。本入口的授权与停止条件优先于参考中的示例命令。

在用户工作区的 清理清单.md 或指定文件记录稳定编号、准确路径/产品 ID、所有者、估计大小、决定、执行状态及实测变化；保留旧决策，不能因重新扫描覆盖授权历史。

## 审计与授权

只读/规划请求不删除、不卸载、不清缓存、不停进程、不改环境、不安排重启。已有具名批准可执行，新候选继续待确认；“优化一下”不授权破坏性操作。目标路径和工作区含空格时引用，使用 LiteralPath 语义，不展开宽泛 glob。

扫描限制到相关卷和具名目录；不跟随 junction/reparse point，不触发 OneDrive 占位文件下载。硬链接、压缩、稀疏文件和 VHDX 造成逻辑大小不同于真正释放量；不能把目录大小相加当收益。

## 执行

操作前重读对象身份、路径归属、当前占用与清单，拒绝空路径、卷根、越界链接和身份变化。优先官方卸载器/包管理器。缓存、用户数据、下载、项目、配置和凭据分别处理；注册表清理不是默认步骤。

不得删除承载当前 Agent、shell、编辑器或活动进程的运行时；先验证保留的替代工具链，再在切换后的独立会话处理旧版本。锁定文件、servicing、未知共享依赖或替代验证失败时停止，不强制解锁。

WinSxS/ResetBase、pagefile、WinRE、更新数据、还原点、WSL/Docker volumes 与虚拟盘压缩分别授权。禁止对活动 VHDX 直接压缩或删除；保留数据库和容器卷。删除操作不可逆时不能把“有清单”称为回滚方案。

## 验收

小批执行前后测量卷可用空间、保留工具的版本/路径和项目可用性。记录已完成、失败、保留、锁定、待重启，不用退出码代替实际结果。不自动重启；只移除本轮创建且无保留必要的临时文件，保留清单与证据。
