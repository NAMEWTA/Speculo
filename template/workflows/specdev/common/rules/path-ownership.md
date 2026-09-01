# 路径所有权与并发规则

路径所有权是逻辑写入边界；worktree 是物理隔离边界，两者不能互相替代。

## 1. 四类路径

- `expected_changes`：导航预测；
- `writable_paths`：当前 Ticket implementation owner 可写的硬边界；
- `read_only_paths`：只读上下文；
- `shared_paths`：多个 Ticket 可能触达且必须有唯一 owner 的项目路径。

所有项目路径使用项目相对 Path 标签。根依赖清单、锁文件、根导出、共享 schema、迁移索引、全局路由和跨 Ticket 合同默认视为 shared。

## 2. 所有权规则

1. 可能并行的 Ticket，其 writable paths 不得相交；glob 按覆盖关系判断。
2. shared path 只由专用 owner Ticket 修改；消费者 Ticket 只读。Lead 负责集成，不以冲突解决替代 shared owner。
3. implementation subagent 只写其 Packet 与 Ticket 授权路径；Lead 自行实现也受同一边界约束。
4. review/research/test-observation agent 只读项目与 SpecDev 工件。
5. 越界前停止并按 deviation control 提出 ownership change；不得先改后报。
6. 上游 Ticket 改变目录/合同后，下游基于已集成父分支重新解析路径和 preflight。

## 3. Ticket workspace strategy

Goal Plan 创建时选择 Ticket workspace strategy，默认 `current`。`current` 模式的 Ticket 使用当前分支、当前 workspace 和严格串行执行；允许一个 implementation subagent 写入当前 workspace，但前一 Ticket 必须完成 commit、Lead 验收和 direct-parent 验证后才能开始下一个。`required` 模式每个 Ticket 使用唯一来源 worktree `specdev-worktree/<ticket-id>`，并通过 candidate-merge 集成。没有 Ticket 的获批 Direct Spec 继续由 current workspace 唯一 owner 执行；只读调查不创建实现 worktree。

workspace/implementation owner 可以是 Lead 或动态 implementation subagent；integration owner 固定为 Lead。current 模式 Lead 在父分支直接验收和推进，required 模式 Lead 建立 parent-candidate、运行适用 E2E 并推进父分支。required 生命周期由 `<Path>{roots.workflows}/specdev/common/skills/dev-worktree/SKILL.md</Path>` 管理，current 生命周期由 I-implement 的 direct-parent 规则管理。

## 4. 并发

required 模式 implementation subagent 上限取 Goal Plan、config 和平台能力共同约束，Lead 不计入。current 模式保持单 writer 串行安全不变量，Ticket 严格串行。review/research/test-observation agent 不设置 SpecDev 数字上限，但 Lead 必须避免重复工作与可变环境争用。

子 change 属于父 Implementation Map 时，再取父 Implementation Plan 的全局 implementation subagent 上限与 workspace 策略；该上限跨全部成员合计。无 dependency 的组合 Ready Tickets 若 writable/shared paths 重叠，也必须在父 Map 建立 serialization。相同 repository/ref 的 parent integration 严格串行；一次父 HEAD 推进会使其他成员旧 candidate 失效。

**完成标准**：每个项目写入映射到唯一 change、Ticket、owner 和来源 worktree；shared 与父分支写入 owner 唯一。
