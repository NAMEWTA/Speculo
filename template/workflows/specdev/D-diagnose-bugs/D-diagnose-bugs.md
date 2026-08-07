---
id: specdev/diagnose-bugs
type: workflow-entry
workflow: specdev
name: 诊断 Bug
description: 通过复现、反馈回路、可证伪假设与最小插桩定位根因，输出修复契约而不是猜测性补丁。
keywords: [bug, 诊断, 根因, 复现, 假设]
---

# 诊断 Bug

诊断阶段默认只读项目代码；可以在当前 change 内创建诊断记录，并进行临时、可撤销的本地实验。未经用户授权，不提交修复、不部署、不执行不可逆操作。

## 输入与产物

- 原始请求：`<Path>{roots.state}/specdev/changes/{change}/source-issue.md</Path>`
- 分诊结果：`<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`
- 当前领域上下文：`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- 当前架构决策：`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- 诊断产物：`<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>`
- 诊断模板：`<Path>{roots.workflows}/specdev/D-diagnose-bugs/diagnosis-template.md</Path>`

## 流程

### 1. 建立最短反馈回路

定义最短复现命令、输入、环境、期望、实际、复现率和观测位置。不能稳定复现时，先缩小观测范围、记录环境差异或建立最小探针，不直接修改业务逻辑。

### 2. 收集事实

读取相关日志、调用链、测试、配置、版本差异、最近变更、运行环境和相邻成功路径。所有条目标注为事实、推断或用户报告；不得把日志缺失当作行为不存在。

外部依赖、版本行为或协议不清楚时，使用 `<Path>{roots.workflows}/specdev/common/skills/research/SKILL.md</Path>`。

### 3. 假设排名

列出 3–7 个可证伪假设，按“证据支持度 × 解释范围 ÷ 验证成本”排序。每个假设必须说明：

- 支持证据；
- 预期可观察结果；
- 反证实验；
- 若被证伪，下一个候选是什么。

### 4. 最小实验

一次只改变一个变量。优先使用定向测试、断言、日志、追踪、调试器、配置切换或隔离环境。插桩必须可移除，不得把诊断日志、永久重试或吞错当作修复。

### 5. 根因确认

根因必须同时解释：

- 触发条件；
- 失败机制；
- 为什么此前未被测试或监控捕获；
- 影响范围；
- 为什么拟议修复能阻断机制；
- 修复可能引入的回归风险。

只能缓解症状时明确标注 workaround，不宣称根因已确认。

### 6. 写入修复契约

使用 `<Path>{roots.workflows}/specdev/D-diagnose-bugs/diagnosis-template.md</Path>` 写入 `<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>`，包含根因、受影响范围、修复不变量、回归测试、非目标、风险和回滚。

修复前回归测试应失败，修复后应通过。诊断产物不夹带未经批准的实现。

### 7. 发布诊断

进入时设置 `<Path>{roots.state}/specdev/status.json</Path>` 当前 change 的 `current_work`；成功完成时将本 Work 去重加入 `works_run` 并清空，暂停或可恢复阻塞时保留。同步 change 自有状态，返回 `<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>`、状态及下一 Work 的完整路径。

- 单一、局部、低风险且契约完全明确：可进入 `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>` 生成 Lite/Standard Ticket，或在用户批准后由 `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>` 使用 Direct Spec 模式；
- 多行为、公共接口、迁移、安全或高风险：进入 `<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>` 或 `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>`；
- 根因仍未知：保持 blocked，继续诊断或进入 `<Path>{roots.workflows}/specdev/W-wayfinder/W-wayfinder.md</Path>`。

## 完成标准

- 有可重复复现，或明确说明为何暂时无法复现；
- 根因有证据和反证过程；
- 回归测试契约在修复前应失败；
- 诊断产物区分根因、workaround 和残余未知；
- 修复契约决策完备；
- 状态、诊断路径和下一 Work 路径已返回；
- 未在诊断阶段偷偷提交修复。

## 子文件引用

- 诊断模板：`<Path>{roots.workflows}/specdev/D-diagnose-bugs/diagnosis-template.md</Path>`
