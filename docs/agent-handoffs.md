# 通用 Agent 编排与任务交接

[手册首页](README.md) · [公共初始化](commands/coordination-init.md) · [显式会话 handoff](commands/handoff.md)

编排是所有 workflow 共用的方法。主 Agent 先判断直接执行、普通工具并行或委派是否适合当前目标，再在实际能力和已有授权内选择通道。用户明确要求、已批准安排与 required 选择优先，preferred 仅按允许的 fallback；保存偏好不授予权限。编排不要求先创建 SpecDev change、Goal 或 Ticket，初始化只保存可选项目偏好。

Lead 负责理解目标、安排依赖、分配输入和写集、派遣、核验结果并继续。Worker 可以直接写分配的计划、票据、地图、说明或代码。正式状态、审批、Evidence 和永久知识仍通过原领域 owner/gateway；各 Work 的前置与质量门继续生效。

## 按恢复需要选择交接

短时、同步、只读且结果能与实际 task/call 关联的委派，可直接返回结构化摘要、发现、检查和未验证项，无需 session 或 TASK/REPORT。主 Agent 自行执行和普通工具并行同样不创建空交接目录。

长时、异步、跨会话、写入、可中断恢复或正式交付任务使用持久交接；宿主原生、CLI、Herdr、Orca 均按同一恢复需求判断。任务扩大到写入或需要恢复时，先由原 owner 明确新范围并建立必要交接，再执行新增动作。完整输入与返回格式由[交接合同](../template/references/coordination/session-files.md)负责。

## 持久交接的目录和文件

- 整轮由一个现有未归档 change 承载：使用它的 `sessions/<session>/<task>/`。
- 跨多个 change 或没有 change：使用 `roots.state/coordination/sessions/<session>/<task>/`。
- 一轮确定范围根后保持不变，后续产生的业务对象引用原交接记录。

session 使用 UTC 时间 `YYYYMMDDTHHMMSSZ`；task 使用递增编号和实际主题，如 `001-plan`、`002-tickets`、`003-explain`、`004-review`。记录用于交接，不镜像工具运行状态。

TASK 由 Lead 派遣前写入并冻结；REPORT 由执行者交回，正式交付后不覆盖。修改目标、基线或执行者时先核对旧 writer 已停写，再建立新 task 并引用原结果。

```yaml
---
schema_version: 2
session: "20261018T080000Z"
task: "003-explain"
kind: explanation
---
```

正文包含 Goal、Inputs、Workspace and Scope、Acceptance、Return，提供真实 Skill 入口、必要背景、上游产物、准确工作区、允许写入路径、验收及报告位置。kind 是任务用途，不能据此获得额外权限。

REPORT 使用 Session、Task、Status 首部和聚焦交接、产物与验证、问题与下一步三节。Status 取 completed、blocked、failed、cancelled；completed 只表示候选交回，Lead 仍需验收。

## 可选会话定位

准确确认执行者日志绝对路径后，Lead 可在任务目录创建 `session-locator.json`，仅保存 `path`：

```json
{"path": "/absolute/path/to/session.jsonl"}
```

取不到就省略，不猜缓存路径、不用父会话冒充子 Agent 日志。持久任务先读 TASK/REPORT 和真实产物，即时任务回读相关工具返回；确有疑问时再定向检索少量历史。定位文件不授予 resume 或重复执行权限。

## 校验和恢复

持久 TASK v2 使用共享只读检查，无需安装 SpecDev：

```bash
node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs \
  --repo . --scope-root .agents/speculo/.speculo/coordination \
  --session 20261018T080000Z --task 003-explain --stage return
```

持久任务派遣前用 dispatch，回收时用 return。即时只读返回使用同一脚本的 `--inline`，从标准输入接收包含 stage、scope、task 及适用 callId/result 的 JSON，可直接管道传入而不创建文件。

退出码 0 表示结构通过、1 为结构失败、2 为参数错误。校验器不扫描日志、不认证身份或授权，也不证明业务完成；领域 lifecycle 仍由 owning Work 核对。持久格式使用当前 TASK v2；历史记录保留原字节，不作为当前派遣输入。

工具断线或结果未知时先查询原任务，确认副作用和 writer 情况后才能继续。当前强制指定的工具不可用时只阻塞相关阶段，不静默替换。共享规则见[编排方法](../template/references/coordination/coordination-contract.md)、[派遣文件合同](../template/references/coordination/session-files.md)和[返回验收](../template/references/coordination/result-and-recovery.md)。

整个会话的总结由用户另行调用 handoff，更新各 change 的 handoff.md；它不会随每次派遣或整轮完成自动生成。
