---
id: handoff
type: command
name: handoff
description: Persist a compact handoff when the user asks another agent or session to continue the current work.
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

交接范围包含 SpecDev change 时，引用该 change 的 `source.md`、`triage.md`、`publish.md`（若请求过）、`.status.json` 和当前 owning 工件，不复制正文。若 `external_action` 为 `pending-close` 或 `close-failed`，必须记录准确远程 locator、已完成步骤、授权状态和恢复入口 `T-triage`；不得把待关闭误报为本地未完成。若 `publish_action` 为 `pending` 或 `publish-failed`，必须记录账本路径、失败行和下一步，恢复入口仍是 T-triage publish。交接范围包含尚未成 Change 的 inbox 记事项时，引用 `<Path>{roots.state}/specdev/capture.md</Path>`（若存在）的失败行与恢复入口 T-triage capture，不创建 change。

## 最小恢复包

先回读当前真实源，再在同一交接报告内记录下列字段；不存在的信息明确缺失，不复制整套 Spec、知识库或完整推理过程。

| 内容 | 必须能够恢复的事实 |
|---|---|
| 目标与边界 | 用户要求的 Outcome、交付数量、已接受决定、范围与不可放宽约束 |
| 当前检查点 | change/Ticket/Run ID、当前 owner、worktree/branch、实际 HEAD 或来源摘要、验证时间 |
| 权威指针 | 当前 owning 工件、直接依赖、Evidence、已命中 Skill 的真实 ID/入口/摘要与触发阶段 |
| 未闭合动作 | 操作 ID、真实授权来源与范围、已知/未知副作用、锁/事务及回执位置；没有则明确无 |
| 下一安全动作 | 一个具体动作、输入、进入条件、验证方式、失败停止点与原恢复入口 |

接收方先核对 roots、owner、HEAD、关键输入摘要与未闭合动作，再继续既有流程。正常恢复只读上述最小集合；漂移、冲突或 unknown 时按领域原合同扩读并停止受影响写集。交接文档中的“已批准”不是新授权，不能据其释放他人锁、重放迁移或重新发布。

OPS 交接引用原 Controller/Host/Project、task/Run/Release、immutable plan/approval/journal/目标 receipt 和 progress；不写凭据值或复制私密配置。started-only、终态失败、docs_pending 分别回到原恢复协议，不能包装成新 task 再试。只向接收方传递已授权范围内必要的 locator 与脱敏证据。

## 路径引用规范

文档中所有文件/文件夹引用必须使用**项目根目录**的相对路径。

- ✅ `src/modules/auth/`
- ✅ `scripts/migrate/2024-add-index.sql`
- ✅ `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- ❌ `../../specdev/changes/...` — 相对于 handoff 文件，脱离目录后不可定位
- ❌ `auth` — 裸名，无法判断是目录/文件/子模块

例外：skills 名称属于逻辑标识而非文件路径，不适用此规则。
