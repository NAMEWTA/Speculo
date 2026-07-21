---
id: specdev/diagnose-bugs
type: workflow-entry
workflow: specdev
name: 诊断
description: 针对疑难 bug 建立诊断循环——构建紧凑反馈回路、复现最小化、可证伪假设排名、插桩定位根因，确认后移交 I-implement 修复。
keywords: [诊断, 调试, bug, 反馈回路, 假设, 根因分析]
---

# 诊断

针对疑难 bug 的诊断规程。先建立紧凑的反馈回路锚定症状，再通过可证伪假设排名定位根因，确认后移交 I-implement 执行修复。仅在明确有理由时才跳过阶段。

在开始诊断之前，读取当前变更的上下文与架构决策：

- **CONTEXT.md** —— 项目领域术语与概念：`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- **ADR.md** —— 架构决策记录：`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`

如果这些文件不存在，先运行 `<Path>{roots.workflows}/specdev/W-wayfinder/W-wayfinder.md</Path>` 或询问用户以建立上下文。

## 流程

### 1. 加载上下文

读取 `<Path>{roots.state}/specdev/status.json</Path>` 确认活跃变更。读取 CONTEXT.md 获取领域词汇表——使用其中已定义的术语。读取 ADR.md 了解已做出的架构决策——诊断过程中涉及的模块若与已有 ADR 相关，在假设中引用。

**完成标准**：活跃变更已确认，领域词汇表和架构决策已加载。`{change}` 已确定。

若诊断过程中遇到不熟悉的第三方库行为、API 语义、运行时特性或工具链细节，先调用 `<Path>{roots.workflows}/specdev/common/research/SKILL.md</Path>` 完成一手来源调查，再继续构建回路。

### 2. 构建反馈回路

委托给 `<Path>{roots.workflows}/specdev/D-diagnose-bugs/feedback-loop-techniques.md</Path>`。构建一个紧凑的通过/失败信号——一条命令，确定性、秒级、agent 可无人值守运行。在此投入不成比例的精力：反馈回路是诊断的超能力。如果确实无法构建回路，向用户明确说明已尝试的方法并请求访问复现环境或捕获产物。

**完成标准**：反馈回路紧凑且具备变红能力——一条命令已运行并通过/失败输出验证，确定性、秒级、agent 可运行。回路断言的是用户的确切症状，而非"运行不出错"。

### 3. 复现与最小化

运行回路，确认它产生用户描述的故障模式。然后逐元素削减输入、调用者、配置和数据——每次削减后重新运行回路——只保留对故障有负载作用的部分。

**完成标准**：回路已复现用户症状。复现场景已最小化——每个剩余元素都有负载作用，移除任何一个都会使回路变绿。

### 4. 提出诊断计划

委托给 `<Path>{roots.workflows}/specdev/D-diagnose-bugs/hypothesis-format.md</Path>`。生成 3-5 个排名假设，每个假设必须是可证伪的——陈述其预测。将排名列表作为诊断计划呈现给用户确认。用户可能拥有立即重排名的领域知识。如果用户 AFK，按排名继续。

**完成标准**：3-5 个可证伪假设已排名并作为诊断计划呈现给用户。用户已确认或 AFK 下按排名继续。

### 5. 插桩验证

委托给 `<Path>{roots.workflows}/specdev/D-diagnose-bugs/instrumentation-rules.md</Path>`。每个探测映射到诊断计划中的一个具体预测。每次只改变一个变量。使用调试器/REPL 优先于日志。所有调试日志使用 `[DEBUG-xxxx]` 唯一前缀标记。

**完成标准**：根因已通过插桩确认——某个假设的预测已验证，其他假设已排除。所有探测结果与诊断计划中的预测对应。

### 6. 移交修复

调用 `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>` 执行修复。移交以下信息：

- **根因描述**——哪个假设被确认，通过什么探测验证
- **最小复现场景**——阶段 3 产出的最小化复现，可直接转为回归测试
- **建议的修复接缝**——在哪个模块/接口处修复最合适

修复、回归测试编写和提交由 I-implement 完成。如果不存在正确的测试缝合点，将此发现记录到 `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>` 并在步骤 7 的事后分析中提出架构改进建议。

**完成标准**：I-implement 已启动，根因描述、最小复现、建议修复接缝已移交。

### 7. 清理与复盘

委托给 `<Path>{roots.workflows}/specdev/D-diagnose-bugs/cleanup-postmortem.md</Path>`。移除所有 `[DEBUG-xxxx]` 标记的插桩代码，删除一次性原型。在 `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>` 中记录：被证实的假设、根因、修复提交。执行事后分析——什么本可以预防这个 bug？如果涉及架构变更，提出改进建议。

**完成标准**：调试产物已清理（grep `[DEBUG-` 无残留），根因已记录到 LOG.md，预防建议已提出。

---

## 子文件引用

| 文件 | 内容 | 触发条件 |
|------|------|---------|
| `<Path>{roots.workflows}/specdev/D-diagnose-bugs/feedback-loop-techniques.md</Path>` | 10 种反馈回路构建技术、收紧回路、非确定性 bug 策略、无法构建回路时的升级路径、最小化协议 | 步骤 2「构建反馈回路」和步骤 3「复现与最小化」进入时 |
| `<Path>{roots.workflows}/specdev/D-diagnose-bugs/hypothesis-format.md</Path>` | 可证伪假设格式模板、排名规则、用户 Plan 呈现模板、AFK 默认行为 | 步骤 4「提出诊断计划」进入时 |
| `<Path>{roots.workflows}/specdev/D-diagnose-bugs/instrumentation-rules.md</Path>` | 探测映射规则、工具偏好、`[DEBUG-xxxx]` 标记约定、性能分支处理 | 步骤 5「插桩验证」进入时 |
| `<Path>{roots.workflows}/specdev/D-diagnose-bugs/cleanup-postmortem.md</Path>` | 清理检查清单、事后分析问题、预防建议记录格式 | 步骤 7「清理与复盘」进入时 |

## 依赖关系

- 依赖 `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>` 执行修复——步骤 6 移交已确认的根因和最小复现
- 依赖 `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>` 和 `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 提供领域上下文——步骤 1 加载
