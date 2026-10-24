# Command authoring contract

## 文件与 frontmatter

Command 的唯一入口与同目录资源包：

```text
template/commands/<id>/COMMAND.md
```

最低 frontmatter：

```yaml
---
id: <kebab-case>
description: <一次调用的行为与结果>
---
```

源只要求 id、description；资源置于同目录 references/scripts/assets。宿主显式调用字段由投影器生成；入口格式不冒充标准 Skill。

## Command、skill、workflow

选择 command：一次用户调用可完成，核心价值是 scope 解析、确认、编排和审计报告。

选择 skill：同一领域判断或操作被多个 command/work 调用，且调用方可以提供目标路径和权限。

选择 workflow：需要跨调用保存阶段、恢复当前 work、管理多个 change 或持续推进长期工件链。

一个 command 可以很长，例如只读审计有大量采集规则；长度不决定类型，跨调用生命周期和复用边界才决定。

## Runtime context

Command 需要路径时：

1. 从当前目录向上寻找 `.agents/speculo/.speculo/workspace.json`；
2. 读取并验证 `path_base` 与 roots；
3. 读取 `{roots.config}`；
4. 需要 workflow 时读取其发现入口和当前协议的权威工件；SpecDev 使用目录/README，不要求业务 status，已明确 Work 不重入领域初始化。

是否允许缺失配置后使用默认值由当前 command 明确决定。需要初始化的 command 应阻塞并提示 `speculo init`；可只读降级的 command 可采用模板默认值并在报告记录。

## 报告

规范路径：

```text
{roots.state}/commands/<id>/<YYYY-MM-DD>-<scope>-<topic>[-NN].md
```

报告至少记录：

- command id 与生成时间；
- 解析后的 project/workspace；
- scope 和用户选择；
- mode 与确认状态；
- 输入快照或可复现边界；
- 计划、执行结果和验证；
- 阻塞与残余风险。

只读模式可由命令明确选择会话报告；无需持久化时不创建报告文件。文件报告使用临时文件 + 原子 rename 写入；最终文件存在时选择新编号，不覆盖。

## Command state

`{roots.state}/commands/<id>/state.json` 只用于跨调用恢复。字段需 schema_version，并明确：

- 读取时机；
- 更新原子性；
- 输入节点或游标；
- 失效检测；
- 回滚或重建方法。

一次性报告不是创建 state 的理由。

## Workflow sidecar

Command 写 workflow 范围 sidecar 时，必须由 领域合同 或 command contract 声明。显式 handoff 的 change/handoff.md 是共享交接方法声明的可更新侧记，由当次唯一交接作者写入；跨对象/无对象的会话报告仍遵守不覆盖规则，不成为业务状态。公共 coordination-init 管理 state/coordination/project.json，保留既有有效规则。

当前 `project-maintenance-docs.json` 是 project-maintenance command 拥有的延迟 sidecar；它不能被其他 command 当作通用写权限。

## 确认

以下动作由 command 或 owning work 在执行前取得明确确认：

- 删除、整目录移动、归档；
- commit、merge、push、tag、stash、历史改写；
- 外部 API 写入、发布、部署；
- 受保护知识的实质改写；
- 不可逆迁移。

确认描述必须列出目标、动作、范围和预期副作用。同一具体批准由 owning 入口核对并复用，不因跨层调用重新询问。执行前验证目标仍与计划相同；新增副作用、扩大范围或漂移时补充确认。

## Skill 调用

Command 调用 skill 时传入：

- runtime roots；
- scope 与用户选项；
- 允许读取和写入的边界；
- mode/确认状态；
- 报告或 state 的 owner 路径；
- 期望的结构化返回。

Skill 返回分析或原子写入内容；command 负责最终审计回执。

## 完成

Command 完成需要同时满足：

- 输出/报告位于唯一规范路径；
- 所有允许的写入已重读；
- state 与真实外部状态一致；
- 未确认路径无受限副作用；
- 报告包含足够信息复现选择与结论；
- 失败不会伪装成部分成功。

archive Command 只为 SpecDev 传明确根/目标并交 A，其完成/取消/知识/移动仍由领域入口负责；其他领域保持原语义。Status 对 SpecDev 按目录与 Outcome 发现，可靠更新时间缺失如实 unknown，不用 mtime 推断停滞。project-maintenance 纳入 state/docs 全局盘点，audit 零写、update 不推进游标、commit 仍受原 Git/state 隔离合同约束。
