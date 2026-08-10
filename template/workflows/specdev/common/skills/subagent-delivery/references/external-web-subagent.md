# External Web Subagent

用户已授权目标 provider 与发送内容范围，且外部网页模型能为当前任务提供实际价值时加载。外部会话永远返回候选，不拥有本地 worktree、commit、SpecDev 状态或 E2E Gate。

## 能力与数据门

先确认 provider 能接收的文件、大小、会话恢复、输出格式和数据保留边界。需要源码包时加载 source-package reference，排除凭据、真实用户数据、运行时状态和无关代码；记录 locator、hash 与 checkpoint。能力或授权不足时改用原生/Lead 执行，不降低合同。

## 投递与返回

Packet 固定目标、范围、合同、checkpoint、路径边界、非 E2E 验证要求和停止条件。外部 provider 返回 patch/文件、修改清单、推理摘要、模拟或自报测试、未验证项和会话 locator。

Lead 在 Ticket worktree 中核对附件 hash、应用候选、检查 diff、依赖与锁文件、运行本地非 E2E 检查并创建 implementation commit。外部自报结果、截图或模拟保持 `unverified`；适用 E2E 仍只在 parent-candidate 状态运行。

## 修正与恢复

修正轮绑定新的源码 checkpoint 或 candidate hash，不覆盖旧附件。会话无法恢复、输出越界或 contract 冲突时停止并保留最后可信包、失败证据和恢复条件。

**完成标准**：发送范围有授权且可审计；本地 commit 与验收完全由 Lead 拥有；外部声明不被当作通过证据。
