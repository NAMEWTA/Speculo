# 创建、复用与恢复 change 工作区

## 前置与创建

1. 核对获批 change、原 owner、项目根、允许写集和工作区选择。复用既有授权，不把创建 worktree 当作提交或合并授权。
2. 重读 README Execution Context、Git worktree list、branch/HEAD/dirty 状态。已有选择与 Git 一致就复用；冲突时停止，不换路径无限新建。
3. current 使用当前项目 checkout，允许 main 或已有工作分支/worktree。worktree 新建默认 branch `speculo/<change>`、locator `specdev-worktree/<change>`；用户指定位置时使用可解析的项目相对 locator。已有外部 checkout 可作为明确 project-root 以 current 复用，不持久化机器绝对路径。
4. 创建前检查目标不存在或精确属于本 change，检查 `specdev-worktree/` 被忽略；只在授权范围补充 ignore。固定真实 base SHA 后创建一个 worktree。恢复不执行创建，不覆盖现有 branch/目录。
5. 在选定工作区读取项目 Agent 指令、适用 Skill、依赖与验证合同，运行实际需要的最小基线。
6. Lead 重验旧字节后原子更新 README 唯一记录并回读；不建立全局镜像。没有安装元数据也可按明确根运行。

## Execution Context

首次真实执行时添加以下锚点和唯一 JSON object；值来自实际操作，不预造空记录。current 同样保存上下文，但不执行 worktree create。

````markdown
<a id="execution-context"></a>
## Execution Context

```json
{
  "schema_version": 1,
  "change": "2026-10-15-example",
  "workspace_policy": "worktree",
  "workspace_ref": "specdev-worktree/2026-10-15-example",
  "branch": "speculo/2026-10-15-example",
  "base_sha": "<actual-immutable-git-sha>",
  "owner": "native:actual-lead",
  "ticket_execution": "auto"
}
```
````

current 使用 `workspace_policy: current`、`workspace_ref: current` 和实际 branch。`ticket_execution` 为无计划时的选择；有计划时计划拥有调度，恢复核对约束不冲突。可选 `max_parallel_tickets` 计量票据；可选 `concurrent_implementation_limit` 计量实际实现者，互不换算；可选 `integration_attempt_limit` 记录验证尝试上限，缺省 3。相关 schema：<Path>{roots.workflows}/specdev/common/schemas/execution-context.schema.json</Path>。

Ticket/Direct Spec 的 workspace_context 统一引用 `<Path>{roots.state}/specdev/changes/{change}/README.md</Path>` 的 execution-context 锚点，不复制 branch/locator/base。实际实现者写原执行记录，正式状态只由 Lead 更新。

## 恢复与迁移

核验 checkout 所属 Git common directory、branch、base 可达、工作区路径和实际 writer。未知 owner、路径链接、漂移或旧活动 per-Ticket worktree 记录先阻塞受影响写入。版本边界按 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path> 拒绝不支持的记录；历史与旧工作区保留，不转换、归并或删除。

**完成标准**：change 唯一工作区可定位，记录与 Git 一致，创建次数不随票据/Agent 数增长。
