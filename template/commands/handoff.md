---
id: handoff
type: command
name: handoff
description: 将当前对话压缩为一份交接文档，供另一个 agent 接手继续工作。
keywords: [handoff, 交接, 移交, 上下文压缩]
argument-hint: "下一个会话将用于什么？"
disable-model-invocation: true
---

编写一份交接文档，总结当前对话，使新的 agent 可以继续此工作。

## 归档路径

报告文件必须写入以下规范路径：

```
<Path>{roots.state}/commands/handoff/{date}-{scope}-{topic}[-NN].md</Path>
```

- **<YYYY-MM-DD>** — 使用当前日期。
- **<scope>** — 工作区、工作流或变更的 scope 标识，使用小写 kebab-case。
- **<topic>** — 从交接范围或用户主题提取，使用小写 kebab-case；无法判断时使用 `speculo`。
- **[-NN]** — 同日同 scope 同 topic 的多份报告，从 `-01` 开始递增；仅首份可省略后缀。

- 禁止将命令报告写入 `temp/`、系统临时目录或工作区内其他非规范位置。

## 内容要求

在文档中包含一个"建议 skills"部分，列出建议 agent 调用的 skills。

不要重复已被其他产物（规范、方案、ADR、issue、commit、diff）覆盖的内容，改用路径或 URL 引用它们。

清除任何敏感信息，如 API 密钥、密码或个人身份信息。

如果用户传入了参数，将其视为对下一个会话重点内容的描述，并据此定制文档。

交接范围包含 SpecDev change 时，引用该 change 的 `source.md`、`triage.md`、`.status.json` 和当前 owning 工件，不复制正文。若 `external_action` 为 `pending-close` 或 `close-failed`，必须记录准确远程 locator、已完成步骤、授权状态和恢复入口 `T-triage`；不得把待关闭误报为本地未完成。

## 路径引用规范

文档中所有文件/文件夹引用必须使用**项目根目录**的相对路径。

- ✅ `src/modules/auth/`
- ✅ `scripts/migrate/2024-add-index.sql`
- ✅ `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- ❌ `../../specdev/changes/...` — 相对于 handoff 文件，脱离目录后不可定位
- ❌ `auth` — 裸名，无法判断是目录/文件/子模块

例外：skills 名称属于逻辑标识而非文件路径，不适用此规则。
