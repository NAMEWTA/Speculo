# Completion Verification Phase（门控）

本阶段是归档前的门控。**没有本次运行的验证证据，不许进入下一阶段。**

## 输入

- 当前 change 目录：`.speculo/dev/<change>/` 下的实现产物（`implementation-log.md`、`verification.md` 等）
- 来源：PRD、issue、slices、诊断结论或用户明确任务
- 项目的测试 / 类型检查 / lint / 构建命令
- 变更 diff（VCS）

## 产物

- `.speculo/dev/<change>/completion-verification.md`，由 `../_templates/completion-verification-template.md` 填写

## 填写引导

按 `04-finalize.md` 的门控函数，对每个完成结论"确定命令 → 运行 → 读输出 → 验证 → 才下结论"。

1. **运行验证命令**：跑与变更相关的测试、类型检查、lint、构建。逐条记录**命令、退出码、通过/失败计数**。无法运行的命令记录原因，对应结论不得声称通过。
2. **逐项核对需求**：重读来源（PRD / issue / slices / 用户任务），建立需求清单，逐项标 `satisfied | missing | partial` 并引用来源；测试通过不能替代需求核对。
3. **回归证据**（若本 change 修了 bug）：确认回归测试经过红-绿验证（写 → 通过 → 回退修复必须失败 → 恢复 → 通过），而不是只通过一次。
4. **代理产物核对**（若部分工作委派给子代理）：检查 VCS diff 验证实际变更，不信任代理的"成功"报告。
5. **调试残留检查**：搜索临时日志、DEBUG 标记、一次性脚本、推测性 / 未启用功能并清理。
6. **下结论**：全部结论均有新鲜证据支撑 → `verification_status: verified`；任一关键项缺证据或失败 → `verification_status: blocked`，并写明实际状态与缺口。

## 边界

- 不夸大、不用"应该""大概""似乎"等措辞；信心 ≠ 证据。
- 不依赖上一轮的旧结果或部分检查。
- `blocked` 时不进入归档；回到 `../03-tdd/03-tdd.md` 或 `../H-diagnose/H-diagnose.md` 修复后重跑本阶段。
- 不修改 `.speculo/.config/RULES.md` 或用户未授权的项目规则文档。

## 完成准则

- `completion-verification.md` 记录了每条结论的命令与输出证据
- 需求清单逐项核对完成，含来源引用
- 调试残留已清理或明确说明
- `completion-verification.md` 无残留 `[TODO:]`
- `.status.json` 写入 `verification_commands`、`requirements_checklist`、`verification_status`
