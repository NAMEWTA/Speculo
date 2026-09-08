# 运行治理细则

规划、写入、并发、恢复、验收或归档时读取。


1. **先发现、后询问**：仓库、配置、schema、测试和文档能回答的事实先探索；只询问真正影响行为、架构、风险、范围、迁移或验收的偏好。
2. **规划深度随风险增长**：Lite、Standard、Deep 由复杂度和事故半径决定，不由文档长度决定。
3. **Ticket 是微型计划**：每个 Ready Ticket 决策完备，但不展开逐行代码。
4. **Goal Plan 按需出现**：简单单票可沿用既有 I/Direct Spec；用户要求长期目标、多个 change 或总控时由统一 P 显式生成，不以固定章节数量作为质量标准。
5. **证据优先**：每个验收合同、Ticket 和 Gate 都必须有可重复验证与 Evidence。
6. **路径所有权**：并发实现者只能修改授权项目路径；shared path 有唯一 owner。
7. **偏差显式化**：计划与事实冲突时停止、记录、修订，不静默扩大范围或改写契约。
8. **状态单一来源**：Ticket frontmatter 是单 Ticket 状态权威；Map 和 Goal Plan 是投影与编排。
9. **知识以当前真相为目标**：归档保留历史，永久知识只保留仍真实且经实现验证的结论。
10. **恢复依赖权威工件**：跨 Work 或 Agent 边界时同步 active change 的 `current_work`，成功完成后去重更新 `works_run`，返回下一 Work 和权威工件的完整路径。
11. **本地执行权威**：远程 Issue/PR/URL 只作为来源或完成投影；Spec、Ticket、Map、Goal Plan、Evidence 和状态始终以本地工件为准。
12. **完成与归档分离**：本地完成按 change completion 合同决定；远程 close 失败不回滚完成，但必须 reconcile 或 waive 后才归档。
13. **Lead 与隔离正交**：Lead 固定拥有 SpecDev 状态、Evidence 与父分支；是否派遣 subagent 由 Lead 动态决定。Goal Plan 创建时询问 Ticket 是否开启 worktree，默认不开启；选择只作用于当前 Goal Plan。
14. **策略化验收**：current 模式使用当前 workspace 严格串行、direct-parent 验证；required 模式使用 source worktree 与 parent-candidate。只有 required 模式创建独立 Ticket worktree。
15. **父子权威隔离**：父实现 change 只拥有 Ready 子 change 的组合 Ticket DAG、serialization、全局 workspace/资源和实现进度投影；子 change 继续拥有全部行为与实现合同。一个未完成子 change 只能属于一个未完成父实现 change。

共享规则：

- `<Path>{roots.workflows}/specdev/common/rules/planning-principles.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/readiness-and-depth.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/path-ownership.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/evidence-and-verification.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/deviation-control.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/path-reference-contract.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/codebase-design.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/parent-implementation-orchestration.md</Path>`


## 保真与局部暂停

用户明确的交付数量、默认工具、风险门禁和权限不会因为入口精简而改变；行为变化必须显式列出。真实源优先，保留软链接、必要元数据、许可和用户未提交改动；系统或插件缓存不属于可写源。资源冲突只暂停相关写集及其依赖闭包；不接管他人 owner、锁或未闭合事务。正式知识必须走原网关。
