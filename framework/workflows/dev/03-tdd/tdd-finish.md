# Finish Phase

## 输入

- `implementation-log.md`
- 项目验证命令和变更 diff
- Skill wrapper：`../../../skills/tdd/SKILL.md`

## 产物

- `verification.md`，由 `../_templates/tdd-verification-template.md` 填写

## 填写引导

1. 运行与变更相关的测试、类型检查、lint 或构建命令。
2. 记录无法运行的命令和阻塞原因。
3. 搜索临时调试标记、一次性脚本和推测性实现。
4. 如有可沉淀经验，按项目规则追加到 `.speculo/.config/LESSONS.md`。

## 边界

- 不自动归档 change；归档由 `../../../commands/archive.md` 负责。
- 不修改 `.speculo/.config/RULES.md`。

## 完成准则

- `verification.md` 无残留 `[TODO:]`
- `.status.json` 的 `implementation_status` 为 `verified` 或 `blocked`
