---
id: caveman
type: command
name: Caveman Mode
description: 启用或关闭超压缩沟通模式
keywords: [caveman, brief, tokens, 简洁]
---

# Caveman 命令

## 归档路径模式

可选产物目录：`../.speculo/commands/<YYYY-MM-DD>-caveman-<topic>/`

模式报告：`../.speculo/commands/<YYYY-MM-DD>-caveman-<topic>/mode.md`

- `<YYYY-MM-DD>` 使用当前日期。
- `<topic>` 从用户请求提取，使用小写 kebab-case；无法判断时使用 `mode`。
- 安装后的实际项目位置是 `speculo/.speculo/commands/<YYYY-MM-DD>-caveman-<topic>/mode.md`。
- 禁止把模式报告写入 `temp/`、系统临时目录或工作区内其他非规范位置。

（通常只改变对话风格，不需要持久化。）

## 调用的 skills

- `../skills/caveman/SKILL.md` — 用户要求启用、关闭或检查 caveman mode 时读取。

## 执行步骤

1. 读取 `../skills/caveman/SKILL.md`。
2. 根据用户意图启用或关闭压缩沟通模式。
3. 若用户只要求启用模式，在对话中确认当前模式即可，不写文件。
4. 若用户要求记录模式切换，把报告写入 `../.speculo/commands/<YYYY-MM-DD>-caveman-<topic>/mode.md`。

## 产物模板（mode.md，可选）

> **服务命令：** `caveman.md`
> **产物文件名：** `mode.md`

```markdown
# Caveman Mode

## 时间
[TODO: ISO 8601 时间戳。]

## 动作
[TODO: 记录启用、关闭或检查模式。]

## 用户原始请求
[TODO: 记录触发命令的用户请求摘要。]
```
