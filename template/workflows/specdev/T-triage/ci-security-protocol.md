# CI 与安全告警

读取 <Path>{roots.workflows}/specdev/T-triage/remote-operations.md</Path> 和 <Path>{roots.workflows}/specdev/T-triage/triage-run-template.md</Path>。独立运行记录由 T 写入 <Path>{roots.state}/specdev/triage-runs/TRI-###.md</Path>，不创建 change 或占用 current_work。

固定 repo、run/alert ID、commit SHA、workflow、时间和可见权限，使用 gh run view / gh api 读取日志与分页结果。先脱敏再持久化。

CI：区分代码/类型/测试、工具版本、依赖、构建产物与临时环境问题。依据同 SHA 的复现、日志、历史与环境差异判断；两次失败不是“非 flaky”的证明。rerun 必须有授权和验证假设，不能靠反复重跑掩盖失败。修复交 <Path>{roots.workflows}/specdev/D-diagnose-bugs/D-diagnose-bugs.md</Path> / <Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>，记录关联 change 后恢复原 run。

安全：按项目政策读取 Dependabot、secret scanning、code scanning 的事实与影响。凭据泄露优先提出撤销/轮换方案，敏感细节保留在受控渠道；公开回复、关闭/删除内容、撤销凭据和修改配置须有准确动作授权。权限不足记 unknown，不能把无法读取当作零告警。修复后依据真实证据关闭，CI 绿不等于依赖安全。

不设默认周期或统一 SLA，不自动合并、安装工具或创建监控。返回分类、证据、待授权动作、路由和恢复位置；只有记录完整并通过 --triage-run 校验才标 completed。
