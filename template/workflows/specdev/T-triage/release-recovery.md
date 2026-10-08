# 恢复原操作

输入必须是已有 TRI/PR/capture/publish/来源回写记录的准确路径与原目标。恢复原记录，不另建成功记录替代失败；检查 owner、锁、漂移和仍有效的授权。普通远程动作按 <Path>{roots.workflows}/specdev/T-triage/remote-operations.md</Path> 恢复。

发布先重新读取准确 tag/SHA、workflow run、Release、registry 中的 package@version、dist-tag。npm 状态为未知时先解决读取/权限问题，不以未查到日志证明未上传。

| 实际状态 | 恢复 |
|---|---|
| 尚未发布，原 SHA 未变，失败原因为暂态且已排除 | 展示并执行已授权的指定 run/job 重跑；重跑后完整验证 |
| 尚未发布，但需要代码/配置变更 | 交 I 修复，形成新的 commit/发布计划；不默认覆盖远程 tag |
| npm 已发布，GitHub Release/正文失败 | 只补缺失的 GitHub 动作，不重新发布 npm；记录读回 |
| npm 已发布，包内容错误 | 新版本修复，保留旧版本与 tag 的事实；不尝试 unpublish 后覆盖 |
| Release 已有人工修改或 SHA 漂移 | 停止受影响更新，比较差异并重新确定计划 |
| 多包部分成功 | 逐包记账，仅继续确认未发布且仍匹配原计划的目标 |

相同根因重试必须记录新证据或与上次的差异；没有差异先停止。不得要求提供 Token 片段作为证明。

错误定位：认证失败核对权限/有效期/OIDC 配置；provenance 核对 runner、repository 和 id-token；E422 核对 tag/Release 已存在与正文；EUSAGE 核对实际 CLI 版本和参数。不要通过默认删 tag、force-push 或删除远程对象处理这些错误。恢复后的 completed 仍需原发布协议的所有目标校验。
