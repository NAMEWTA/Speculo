# 原生 Subagent 交付

当前 Lead 能直接创建和管理隔离 Agent 时加载。

## 派单与隔离

每个 Ticket 使用唯一 Agent 标识，并接收一个独立 Dispatch Packet：

```text
DISPATCH ticket=<id> wave=<wave> gate=<gate>
baseline=<sha> branch=<branch> workspace=<workspace-ref>
ticket_path=<full-ticket-path> evidence_path=<full-evidence-path>
```

派单块还必须给出项目 `writable_paths`、`read_only_paths`、`shared_paths`、完成的依赖 Evidence、合同 ID、验证矩阵、反向验证、权限和偏差升级方式。Agent 先核对基线与路径，再用不超过 10 行的开工回执记录目标、顺序和最大风险；回执写入 Ticket Evidence，不新增进度文件。

并行写代码时由 Lead 调用 `<Path>{roots.workflows}/specdev/common/skills/dev-worktree/SKILL.md</Path>`。所有并行 Ticket 固定同一 `base_sha`，使用独立分支和 `workspace_ref`；Agent 只修改获准项目路径，只把 Ticket 推进到 `review`。

## 审查与修正

候选交付必须同时通过：

- 标准轴：正确性、架构、错误处理、安全、依赖和测试质量；
- 规范轴：Spec、ADR、Ticket、Goal Plan、路径合同和验收映射；
- Lead 复跑的定向验证与适用回归；
- 对可能静默失效的门禁执行一次受控反向验证，并恢复绿色基线。

失败时沿用同一 Agent 或建立明确继任者，返回失败标准、命令与退出状态、最小错误、文件位置、正确约束、当前 checkpoint 和必须保留的已通过行为。达到修正上限后标记 blocker，不无限重派。

## 返回

Agent 返回 Ticket 状态、`<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>`、`workspace_ref`、checkpoint、commit/PR 引用和待 Lead E2E。Lead 负责应用或集成、回归、Gate 判断和状态同步；逻辑冲突返回契约 owner，不机械选择某一侧版本。

**完成标准**：派单、工作区、路径修改、审查、修正和返回均可由 Goal Plan、Evidence 与 change 状态恢复。

