# 路径所有权与并发规则

路径所有权是并行执行的硬边界，不是文件预测清单。

## 1. 四类路径

- `expected_changes`：预计修改的项目路径，仅用于导航；每项写成项目相对 Path 标签。
- `writable_paths`：实现者获准修改的项目路径或 glob，是硬约束。
- `read_only_paths`：建立上下文但不得修改的项目路径。
- `shared_paths`：多个 Ticket 可能需要修改的项目路径，必须指定唯一 owner。

示例：

```yaml
expected_changes: ["<Path>src/auth/session.ts</Path>"]
writable_paths: ["<Path>src/auth/**</Path>"]
read_only_paths: ["<Path>src/users/**</Path>"]
shared_paths: ["<Path>package.json</Path>"]
```

## 2. 所有权规则

1. 可能并行的 Ticket，其 `writable_paths` 不得相交。
2. glob 与具体路径按覆盖关系判断，不得只比较字符串。
3. 根依赖清单、锁文件、根导出、共享 schema、迁移索引、全局路由和跨 Ticket 合同文件默认视为 shared。
4. shared path 只能由专用 owner Ticket 或 Goal Plan 明确指定的唯一集成 owner 修改；消费者 Ticket 只读。委派 Goal Plan 可以把该 owner 指定为 Lead，但普通计划不预设角色。
5. 需要越界时先停止，按 `<Path>{roots.workflows}/specdev/common/rules/deviation-control.md</Path>` 提出 ownership change；不得先改后报。
6. 前置 Ticket 改变目录结构后，后续 Ticket 开始前重新解析项目路径；若授权范围语义未改变，可只更新导航路径。
7. 不得把“最后解决合并冲突”当作所有权方案。

## 3. Worktree 与分支

Worktree 只在存在可观察隔离需求时使用：并行写入、保护当前本地状态、一次性实验、后台恢复、provider 要求或用户明确要求。只读调查和没有其他隔离事实的顺序写入默认共用当前工作区。Agent Team、Ticket 数量和泛化的“更安全”都不构成隔离理由。Worktree 防止工作区污染，路径所有权防止逻辑冲突，两者不能互相替代。

生命周期由调用方明确的 workspace owner 与 integration owner 按 `<Path>{roots.workflows}/specdev/common/skills/dev-worktree/SKILL.md</Path>` 管理。`single-session` 通常把两者映射为主会话；`lead-team` 可以把 integration owner 映射为 Lead，但角色选择不决定是否使用 worktree。同一 current workspace 只允许一个项目与 SpecDev 状态写入 owner；Worker 要写项目文件时必须拥有独立 workspace。编排规则位于 `<Path>{roots.workflows}/specdev/P-goal-plan/orchestration-protocol.md</Path>`。
