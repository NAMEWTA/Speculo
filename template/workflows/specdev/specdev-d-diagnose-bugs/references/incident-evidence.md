# 事件证据调查

当故障只发生过一次、暂时无法复现，或缺少安全的运行环境时读取。此分支允许收集事实，不放宽已确认根因的红灯标准。当前 Work 仍为 `specdev/diagnose-bugs`；原 diagnosis 与 diagnostics 承载结果，不新建事故状态或永久知识。

## 可执行的调查

1. 固定事件、时间区间、受影响对象、版本和读权限。按来源定位脱敏日志、trace、变更、配置和相关源码路径，不全面导出生产数据。
2. 分开写直接观察、来源之间的矛盾、尚缺证据和待验证解释。只读源码可以帮助确定下一步观测点，但解释不进入“已确认根因”或正式假设实验结果。
3. 按信息增益和风险排列下一安全检查。生产插桩、重放有副作用请求、真实数据修改或对外调用需要原动作明确授权；缺少授权不代表可以换一个入口执行。
4. 事件材料仍写入 diagnosis 的现象部分与附加事件证据节。`feedback_loop_ready` 保持 false，`red_command/red_evidence` 不伪造，正式假设表保持为空，状态为 reproducing 或 blocked；已确认根因和修复契约明确“尚未确认”。
5. 写入 <Path>{roots.workflows}/specdev/common/rules/engineering-evidence.md</Path> 规定的 kind=incident 记录，运行 `--stage diagnosis --engineering incident`。校验通过只证明记录满足条件，不表示 bug 已解决或可以 Ready 实施。

## 转入正常诊断

获得一条确实命中精确症状的已运行红灯回路后，再按 <Path>{roots.workflows}/specdev/specdev-d-diagnose-bugs/references/feedback-loop.md</Path> 最小化并进入正式假设/探针。编译失败、未选中测试或基础设施失败不是红灯；临时 probe 要证明落在真实路径并恢复。

反馈回路与确认实验齐全前，不设置 root-cause-confirmed，不移交声称已确认的 Ready 修复。收集完事件材料不把 D 记成根因诊断成功；在原报告保留缺失证据、owner 和恢复入口。用户选择终止调查时按原取消/交接协议处理，不伪造已完成诊断或重新打开归档来源。

## 示例

部署后出现一次重复扣款：可以检查脱敏请求 ID、时间、部署 diff 和幂等实现，提出“先核对支付方回执”的安全检查；不能在真实支付端重放以求红灯，也不能仅凭某个可疑分支宣称它就是根因。重复端口错误的 CI 则先核对 worker/job 拓扑和资源分配，使用 <Path>{roots.workflows}/specdev/common/rules/test-reliability.md</Path> 建立确定性观察，不用扩大 sleep 代替原因。
