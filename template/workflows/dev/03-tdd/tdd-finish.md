# Finish Phase

## 输入

- `implementation-log.md`
- 项目验证命令和变更 diff
- `03-tdd.md` 中的内置 TDD 指引和同目录 `refactoring.md`

## 产物

- `speculo/.speculo/dev/<change>/tdd/<phase-id>/verification.md`，由 `../_templates/tdd-verification-template.md` 填写

## 填写引导

1. 运行与变更相关的测试、类型检查、lint 或构建命令。
2. **运行本切片「验收切片」**：执行切片记录的验收命令/步骤；**删除型切片须做残留扫描**（`grep -rn "<符号>" <范围>` 应 0 命中），记录证据。
3. **核对「保留/不动」未被破坏**：确认实现未触碰切片冻结的常量 / 共享依赖 / 邻近功能。
4. 记录无法运行的命令和阻塞原因。
5. 搜索临时调试标记、一次性脚本和推测性实现。
6. 验证通过后，把 slices 中该阶段 `<phase id="<phase-id>">` 的 `status` 由 `未开始` 置为 `已实现`（契约见 `03-tdd.md`「phase 阶段状态（XML 契约）」；本工作流只做这一跳，`已验证` 由 `dev/04` 置入；无 slices 则跳过）。
7. 如有可沉淀经验，记录在 `verification.md` 的后续建议中；在用户允许或项目规则允许时追加到 `speculo/.speculo/.config/LESSONS.md`。

## 边界

- 不自动归档 change；归档由 `commands/archive.md` 负责。
- 不修改 `speculo/.speculo/.config/RULES.md` 或用户未明确授权的项目规则文档。

## 完成准则

- 本切片「验收切片」已运行通过（删除型切片含残留扫描 `grep` 0 命中），并在 `verification.md` 留证
- 「保留/不动」清单经核对未被破坏
- 多阶段 slices：该阶段 `<phase>` 的 `status` 已由 `未开始` 置为 `已实现`（无 slices 则不适用）
- `verification.md` 无残留 `[TODO:]`
- `.status.json` 的 `implementation_status` 为 `verified` 或 `blocked`
