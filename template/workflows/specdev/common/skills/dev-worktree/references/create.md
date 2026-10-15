# Create Or Restore Worktree

## 前置条件

- Ticket Ready 或完整 Direct Spec 已获批且规格就绪，项目根是有效 Git repository，父分支和 `base_sha` 可解析；
- implementation commit 与 local candidate integration/父分支更新已授权；
- workspace、implementation、integration owner 唯一；integration owner 必须为 Lead；
- 检查 `specdev-worktree/` 已被 Git ignore；未初始化项目由当前 I 在授权写集内补充该忽略规则并记录，不能强制运行 init；
- 目标 branch/worktree 不覆盖现有用户 workspace，路径合同无冲突。

## 创建来源 worktree

先确定 `unit-id`：Ticket 使用真实 ID（如 T-01），Direct Spec 固定为 `direct-spec`；change 使用已解析的 change 名。下列路径由两者共同限定。

1. 重读父分支 HEAD、工作树、现有 worktrees 与 refs；父 HEAD 与计划基线不一致时由 Lead决定更新 `base_sha` 或阻塞；
2. 固定 branch `speculo/<change>/<unit-id>` 与 locator `specdev-worktree/<change>/<unit-id>`；
3. 确认目标 branch/path 不存在，或其实际记录精确匹配当前实现单元；
4. 从 `base_sha` 创建 Git worktree，不复用其他实现单元目录；
5. 在来源 worktree 读取项目 Agent 指令、依赖、构建与路径合同；
6. 安装实际需要的依赖，运行最小非 E2E 基线；
7. Lead 将实际 workspace、owner、checkpoint 和 `status: active` 记录在本单元原 Evidence 的 `## Workspace Execution Record` 唯一 JSON object 中，保留原执行字段；不创建全局 worktree 镜像。

初始记录：

```json
{
  "ticket_id": "T-01",
  "owner": "lead",
  "implementation_owner": "lead-or-dynamic-agent",
  "integration_owner": "lead",
  "provider": "git",
  "base_sha": "<immutable-sha>",
  "parent_branch": "<parent-branch>",
  "branch": "speculo/<change>/T-01",
  "workspace_ref": "specdev-worktree/<change>/T-01",
  "source_checkpoint": null,
  "integration": {
    "status": "pending",
    "parent_ref": "<parent-branch>",
    "parent_before_sha": null,
    "source_sha": null,
    "candidate_sha": null,
    "candidate_tree_sha": null,
    "candidate_branch": null,
    "candidate_workspace_ref": null,
    "result_sha": null,
    "method": null,
    "conflict_paths": [],
    "verification": "pending",
    "full_suite": {"required": true, "status": "pending", "reason": null, "evidence": null},
    "e2e": {"required": false, "status": "not-required", "reason": "实际范围无端到端风险时填写依据", "evidence": null},
    "evidence": "<Path>{roots.state}/specdev/changes/<change>/evidence/T-01.md</Path>",
    "attempts": 0,
    "promotion_status": "pending"
  },
  "status": "active",
  "updated_at": "<ISO-8601>"
}
```

Direct Spec 将 `ticket_id` 替换为 `purpose: "direct-spec"`、`change: "<change>"`、`integration_attempt_limit: <实际正整数上限>`；branch 与 workspace 的单元部分替换为 direct-spec，integration.evidence 指向 <Path>{roots.state}/specdev/changes/{change}/evidence/direct-spec.md</Path>。不额外创建 Ticket。

`full_suite` 与 `e2e` 的 required/reason 依据 Spec/Ticket/有效计划的实际验证合同；required 初始为 pending，not-required 必须给真实理由。未发生操作不预填通过。

## 恢复

恢复时核对 repository、branch、locator、`base_sha`、实际 HEAD、dirty 状态和 owner。状态记录与 Git 不一致、branch 被其他 worktree 占用或出现越界修改时停止；Lead 写 blocker，不重建覆盖。

进入 `review` 前必须由 implementation owner 创建最终 commit；Lead 重读 branch tip、diff 与 `git status`，把精确 SHA 写入 `source_checkpoint`。

**完成标准**：来源 worktree 可定位且唯一；基线、记录与 Git 一致；source 检查不含 E2E；失败时保留现场。
