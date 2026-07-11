---
name: handoff
description: 将当前对话压缩为一份交接文档，供另一个 agent 接手继续工作。
argument-hint: "下一个会话将用于什么？"
disable-model-invocation: true
---

编写一份交接文档，总结当前对话，使新的 agent 可以继续此工作。保存到用户操作系统的临时目录 —— 而非当前工作区。

在文档中包含一个"建议 skills"部分，列出建议 agent 调用的 skills。

不要重复已被其他产物（规范、方案、ADR、issue、commit、diff）覆盖的内容，改用路径或 URL 引用它们。

清除任何敏感信息，如 API 密钥、密码或个人身份信息。

如果用户传入了参数，将其视为对下一个会话重点内容的描述，并据此定制文档。
