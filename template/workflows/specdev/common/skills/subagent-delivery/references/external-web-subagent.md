# 外部网页 Subagent 交付

用户或已批准 Goal Plan 明确选择网页模型时加载；原生能力不足本身不授权向外部 provider 发送上下文。外部输出是候选交付，Lead 的本地核对决定验收状态。

## 能力探测与会话

首次使用或界面变化时实测并记录：provider、稳定 session locator、仓库访问、附件上传与返回、长任务状态和认证交接。Provider 名称只是标识；只有能力差异改变交付路径时才产生分支。

登录、账号选择、密码、验证码、Passkey、两步验证、恢复码和 CAPTCHA 由用户在界面内完成。认证秘密不进入派单、源码包、Goal Plan 或 Evidence；发送仓库链接、源码或附件前还必须确认 provider 和内容范围已获授权。

每个独立复杂 Ticket 使用独立会话；强耦合修正可以复用原会话。会话记录绑定 Ticket、branch、checkpoint、附件 hash、最近完整交付和修正轮次。恢复时先定位最后完整输出并核对 checkpoint；不可恢复时，新会话携带旧 locator、当前 checkpoint、已验收摘要和剩余事项。

## 工程派单

派单块必须提供：

1. repository locator、branch、不可变 checkpoint 和源码包 hash；
2. 用户结果、里程碑位置、相关模块、公共契约和领域不变量；
3. allowed/read-only/shared 路径、保留行为和依赖策略；
4. 需要返回的方案、修改清单、patch/源码、测试、实际命令和风险；
5. 当前授权矩阵与逐项验收标准；
6. 未实际运行的检查必须标记 `unverified`。

公开仓库 URL 使用 `<Url>https://example.com/owner/repository</Url>` 形式并同时给出 branch 与 checkpoint。Provider 无法读取仓库、需要私有上下文或固定工作区快照时使用 source-package 分支。

## 候选交付与修正

Lead 在隔离工作区从派单 checkpoint 应用候选交付，核对附件 hash、修改范围、依赖与锁文件、数据和安全边界，再运行 Ticket 与 Goal Plan 要求的验证。模拟结果、provider 自报测试和静态推断分别标记，不替代本地或目标环境证据。

修正请求必须包含未通过项、checkpoint、命令与退出状态、最小错误、项目位置、正确约束和必须保留的已通过行为。每轮重新核对 checkpoint、范围、受影响检查和验收矩阵；达到修正上限后形成 blocker。

**完成标准**：每轮会话和候选交付绑定唯一基线；每个 `pass` 有 Lead 独立证据，未验证项保持显式。
