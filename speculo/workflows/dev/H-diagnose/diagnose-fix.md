# Fix Regression Phase

## 输入

- `diagnosis.md`
- 已确认或最高可信假设
- 原始反馈循环和可用测试接缝
- `H-diagnose.md` 中的内置诊断指引
- 同目录 `diagnose-guide.md`

## 产物

- `.speculo/dev/<change>/regression.md`，由 `../_templates/regression-template.md` 填写

## 填写引导

1. 在修复前寻找能复现真实 Bug 模式的回归测试接缝。
2. 存在正确接缝时，先写失败测试，再应用修复，再验证通过。
3. 不存在正确接缝时，记录架构发现和后续改善建议。
4. 重新运行原始反馈循环，确认用户报告的问题不再复现。
5. 清理所有带标记的调试日志和一次性原型。
6. 完成前确认回归测试通过或缺少接缝已记录，所有 `[DEBUG-...]` 插桩已移除，最终正确假设已写入 `regression.md`。

## 边界

- 不提交未验证修复。
- 不自动归档 change。
- 不修改 `.speculo/.config/RULES.md` 或用户未明确授权的项目规则文档。

## 完成准则

- `regression.md` 无残留 `[TODO:]`
- `.status.json` 已记录 `regression_test`
- 原始反馈循环重新验证完成或阻塞原因已记录
