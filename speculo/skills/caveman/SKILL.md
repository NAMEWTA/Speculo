---
id: caveman
type: skill
name: Caveman
description: 启用或关闭超压缩沟通模式以降低 token 消耗；当用户要求 caveman mode、少 token、极简技术表达，或调用 command/caveman 时使用。
---

# Caveman

## 何时使用

当用户要求 `caveman mode`、`talk like caveman`、`use caveman`、少 token、极简表达、`be brief`，或调用对应 command 时使用。

当用户要求 `stop caveman`、`normal mode` 或明确恢复正常表达时关闭。

## 输入

- 用户对沟通模式的启用、关闭或保持要求
- 当前对话中的技术事实、风险和下一步动作
- 需要原样保留的代码、命令、错误信息或用户引用

## 输出

- 保留技术准确性的压缩回复风格
- 必要时对安全风险、不可逆操作或多步骤顺序使用完整清晰表达
- 不产生 `speculo/.speculo/` 或 `.status.json` 持久化产物

## 执行步骤

1. 判定用户是在启用、关闭还是检查 caveman mode。
2. 启用后跨轮保持，直到用户明确关闭。
3. 使用 `references/compression-rules.md` 的压缩规则、例外和示例。
4. 原样保留代码块、命令、错误信息和需要精确引用的文本。
5. 遇到安全警告、不可逆操作确认、易误读的多步骤序列或用户反复澄清时，暂时退出压缩表达；清晰部分结束后恢复。

## 渐进披露

- `references/compression-rules.md`：启用 caveman mode 或判断何时暂时退出压缩表达时读取。
