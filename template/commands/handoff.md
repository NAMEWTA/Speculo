---
name: handoff
description: 将当前对话压缩为一份交接文档，供另一个 agent 接手继续工作。
argument-hint: "下一个会话将用于什么？"
disable-model-invocation: true
---

编写一份交接文档，总结当前对话，使新的 agent 可以继续此工作。

## 归档路径

报告文件必须写入以下规范路径：

```
speculo/.speculo/commands/handoff/<YYYY-MM-DD>-<scope>-<topic>[-NN].md
```

- **<YYYY-MM-DD>** — 使用当前日期。
- **<scope>** — 工作区、工作流或变更的 scope 标识，使用小写 kebab-case。
- **<topic>** — 从交接范围或用户主题提取，使用小写 kebab-case；无法判断时使用 `speculo`。
- **[-NN]** — 同日同 scope 同 topic 的多份报告，从 `-01` 开始递增；仅首份可省略后缀。

> [!CAUTION]
> **禁止**将命令报告写入 `temp/`、系统临时目录或工作区内其他非规范位置。

## 内容要求

在文档中包含一个"建议 skills"部分，列出建议 agent 调用的 skills。

不要重复已被其他产物（规范、方案、ADR、issue、commit、diff）覆盖的内容，改用路径或 URL 引用它们。

清除任何敏感信息，如 API 密钥、密码或个人身份信息。

如果用户传入了参数，将其视为对下一个会话重点内容的描述，并据此定制文档。
