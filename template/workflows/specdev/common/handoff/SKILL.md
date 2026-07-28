---
name: handoff
description: "将一段对话或子代理会话压缩为一份交接文档，供另一个 agent 接手继续工作。适用于 Lead 压缩子代理实现上下文、会话移交、或任何需要把上下文浓缩为可持久化摘要的场景。"
---

# Handoff — 交接文档

将当前对话（或指定的子代理会话）压缩为一份交接文档，使新的 agent 无需读取完整转录即可继续工作。

## 内容要求

交接文档包含以下部分：

- **做了什么** —— 实现或完成的工作摘要
- **关键决策** —— 做出的决策及理由；与 spec/plan 的任何偏差及原因
- **验证状态** —— 测试结果摘要、已运行的检查
- **产物引用** —— 相关 spec、ADR、commit、diff 的路径或 URL
- **建议 skills** —— 建议接手 agent 调用的 skills 列表

不重复已被其他产物（spec、方案、ADR、issue、commit、diff）覆盖的内容，改用路径或 URL 引用它们。

清除任何敏感信息，如 API 密钥、密码或个人身份信息。

如果调用方传入了对下一个会话重点的描述，据此定制文档内容。

## 产物位置

产物位置由调用方指定：

- Lead 编排场景（子代理交接）：写入操作系统临时目录，关键信息由调用方回写到对应 ticket 文件（参见 `<Path>{roots.workflows}/specdev/P-goal-plan/lead-orchestration-protocol.md</Path>` §2.2）
- 调用方未指定时：写入 `<Path>{roots.state}/specdev/changes/{change}/handoff/<YYYY-MM-DD>-<topic>.md</Path>`

## 路径引用规范

文档中所有文件/文件夹引用使用**项目根目录**的相对路径。

- ✅ `src/modules/auth/`
- ✅ `speculo/.speculo/specdev/changes/<YYYY-MM-DD>-<topic>/spec.md`
- ❌ `../../specdev/changes/...` — 相对于交接文档自身，脱离目录后不可定位
- ❌ `auth` — 裸名，无法判断是目录/文件/子模块

例外：skills 名称属于逻辑标识而非文件路径，不适用此规则。
