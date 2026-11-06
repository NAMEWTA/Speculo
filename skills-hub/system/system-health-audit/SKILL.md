---
name: system-health-audit
description: 只读检查 Windows、macOS 或 Linux 开发机的资源与工具链，定位变慢或空间紧张的原因。
license: MIT
---

# 系统健康审计

根据症状、发生时间和工作负载采集相关基线，交付有证据的瓶颈判断与下一步。先确认目标是本机、远端、WSL 还是容器，不用当前容器代表用户电脑。

本包的 Python 3.10+ 脚本只读、离线、不提权；`SKILL_DIR` 是本文件目录：

```bash
python3 "$SKILL_DIR/scripts/system_audit.py"
python3 "$SKILL_DIR/scripts/system_audit.py" --path /path/on/target/volume
```

Windows 使用实际 Python 或 `py -3`，路径正确引用。脚本输出是基线，不是性能评分。
需要进一步采样时读 [平台工具](references/platforms.md)，只收集与问题有关的时间窗口与数据，避免重复全盘扫描或输出凭据、完整环境和进程秘密参数。

区分观察与假设，记录采样时的负载。仅审计时不清理、停止进程或改变系统设置；建议应说明具体对象、预期作用与验证方式。
真实优化要在可比负载下前后测量。交付已观察数据、原因可信度与未验证项，没有修改就不宣称已提速。
