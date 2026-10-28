# 必要工程偏好与真实工具配置

当前开发任务确需持久化工程偏好或工具设置时读取。项目编排偏好由公共 command/coordination-init 管理；本 Work 不再负责其初始化问答或写入。

## 其他必要偏好

语言、用户工具和明确产物数量复用当次请求或现有项目说明。实现并发、worktree、集成尝试上限只在原 Goal/Implementation Plan 真正启用时明确，由计划 `## Execution Policy Source` 记录实际来源；工作区默认 current，并发与共享资源约束按 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path> 独立判断。Lead 自己实现计入实现并发，只读协作者不设新数字上限。UI 缺省 3、配置 2–4、用户明确数量覆盖上限；一次 override 留当前设计包，不改全局偏好。

现有 <Path>{roots.state}/specdev/config.json</Path> 中 GitHub labels/include_external_prs、验证/planning 等真实消费者配置，可按 <Path>{roots.workflows}/specdev/common/schemas/config.schema.json</Path> 验证和保留；只有确需该工具时才创建，必要结构参考 <Path>{roots.workflows}/specdev/specdev-i-init-setup/assets/config-template.json</Path>。不把旧配置整份机械改写为 config.md；未知独有字段保留并报告。无标签只阻塞相关远程写入。

任何配置更新先核对实际差异和授权，不保存秘密或凭据，不存全局自动 commit/集成/发布开关。未知验证命令为 null/未知，必须有仓库或真实用户来源。既有无效/未知 schema 不重置、不迁移；显式转换由原 owner 执行。

change/ADR/context/docs/archive/design 等只在真实首次内容写入时创建；不生成 status、change status、空知识树、空批准槽或跟踪镜像。项目说明确需导航时可使用 <Path>{roots.workflows}/specdev/specdev-i-init-setup/assets/tracking-template.md</Path> 与 <Path>{roots.workflows}/specdev/specdev-i-init-setup/assets/domain-layout-template.md</Path> 的相关内容，不要求输出两份配置文档。工程 docs 基线由入口的共享事实方法负责。
