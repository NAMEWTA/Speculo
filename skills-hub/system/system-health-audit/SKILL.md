---
name: system-health-audit
description: 只读审计 Windows、macOS、Linux 开发机资源和工具链，区分主机、WSL、容器与远程环境，为变慢或空间紧张提供证据和具名计划。不自动清理、调参、改代理或配置编辑器。
license: MIT
compatibility: Bundled baseline requires Python 3.10+ on Windows/macOS/Linux. Default collection is offline, read-only and unprivileged.
metadata:
  author: NAMEWTA
  wta-format-reviewed: '2026-10-06'
---
# 跨平台系统健康审计

## 输入与输出契约

取得症状、发生时间、目标环境、受影响工作负载与允许的采样范围。先复用已读证据，再按需要采集短时基线，不用当前容器代替用户电脑。

给出采样窗口/负载、已观察数值、瓶颈假设及证据强弱、具名下一步与未验证项。仅审计时明确零系统修改，不能声称已优化或已提速。

示例：“Windows 开发机最近编译慢，先只读定位瓶颈，不删除东西。”应进入本技能；“直接清理我已经批准的 C 盘缓存目录。”不应由本技能接管。

先确认目标是用户本机、远程主机、WSL 还是容器；工具所在环境不能替代用户设备。默认仅审计。已有明确具体改动授权也不直接套用一键优化；先验证前置条件和回滚。

Python 3.10+ 的 [基线脚本](scripts/system_audit.py) 不联网、不提权、不递归扫描、不调用包管理器、不改设置。`SKILL_DIR` 为本文件目录：

```bash
python3 "$SKILL_DIR/scripts/system_audit.py"
python3 "$SKILL_DIR/scripts/system_audit.py" --path /path/on/target/volume
```

PowerShell 使用 `& python "$SKILL_DIR\scripts\system_audit.py" --path 'C:\'`，先验证解释器；有 py launcher 可用 `py -3`。路径包含空格必须引用。输出隐藏用户名和路径，只说明所选文件系统；CPU 数量和磁盘余量不是性能评分。

按系统读取 [平台工作流](references/platforms.md)，采集与症状相关的短时证据。复用已有结果，避免反复全盘扫描。记录版本、架构、权限、工具存在性、采样时间/负载、磁盘可用量以及失败/未知项。默认不导出完整环境、进程命令行、凭据或日志。

## 优化计划

先给基线与瓶颈假设，再给具名动作、预期收益、影响、授权、回滚和验证命令。区分缓存/用户数据/活动运行时，不能凭目录名删除。系统更新、驱动、固件、内核参数、杀毒、swap/pagefile、索引、Docker/WSL 虚拟盘与服务开关都不在一般审计授权内。

Linux 具名空间清理由 linux-dev-disk-cleanup；Windows 具名空间清理由 windows-dev-disk-cleanup；Clash 网络由 clash-client-profile；系统时区/语言由 proxy-region-locale；VS Code Profile 由 vscode-fullstack。未安装其他技能时交付清单，不假定兄弟目录存在。

## 完成标准

提交症状、目标环境、已观察基线、证据支持的假设、分优先级动作与未验证项。优化收益应在可比工作负载下前后测量；没有修改就明确“仅审计”，不报告已提速。
