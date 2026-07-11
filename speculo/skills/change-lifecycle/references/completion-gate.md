# Completion Verification

本门控只服务 `finalize-active`。没有本次运行的新鲜证据时返回 blocked。

## 输入与产物

- 输入：当前 change 产物、route/phase 完成准则、需求来源、VCS diff 和项目验证命令。
- 产物：当前 change 下的 `completion-verification.md`，使用 `../assets/completion-verification-template.md`。

## 门控

1. 运行相关测试、类型检查、lint 和构建，逐条记录命令、退出码与通过/失败计数。
2. 重读 PRD、issue、spec 或用户任务，逐项标记 `satisfied | missing | partial` 并引用来源。
3. Bug 修复确认回归测试经过红、绿、回退修复再红、恢复再绿；无法证明时记录缺口。
4. 子代理参与时以 VCS diff 和实际文件为证据，不使用代理自报结论。
5. 搜索调试日志、一次性脚本、DEBUG 标记和未启用功能，清理或记录阻塞。
6. 全部关键项有证据时写 `verification_status: verified`，否则写 `blocked` 并停止归档。

完成标准：需求清单与每项结论均有新鲜证据，产物无 `[TODO:]`，change 状态已记录验证命令、需求清单和裁决。
