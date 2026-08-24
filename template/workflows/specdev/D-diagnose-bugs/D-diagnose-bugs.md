---
id: specdev/diagnose-bugs
type: workflow-entry
workflow: specdev
name: 诊断 Bug
description: 先建立会在精确症状上变红的紧凑反馈回路，再通过最小化、排名假设和单变量探针确认根因，输出修复契约而不实施生产修复。
keywords: [bug, 诊断, 红灯, tight-loop, 根因, 复现, 假设]
---

# 诊断 Bug

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/specdev/README.md</Path>`，再执行本入口。

D 的主导词是**红灯**：没有一条已执行且能在此 bug 上变红的紧凑命令，就没有可进入的假设阶段。D 默认只读项目代码，可以创建 change 诊断工件和经授权的临时可撤销探针；生产修复由 Implement 拥有。

## 输入与所有权

按存在情况读取：

- `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- 相关代码、测试、配置、日志和运行环境事实。

D 拥有：

- `<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/diagnostics/</Path>`，仅在需要脚本、捕获物或临时探针结果时延迟创建。

## 流程

### 1. 建立并执行红灯回路

加载 `<Path>{roots.workflows}/specdev/D-diagnose-bugs/feedback-loop.md</Path>`。按其顺序尝试测试、HTTP/CLI、浏览器、追踪回放、夹具、模糊循环、bisect、差分和最终 HITL。保存命令、至少一次真实输出、精确症状断言、运行时间、确定性或复现率，以及 Agent 可运行性。

无法建立回路时立即使用诊断模板写 `status: blocked`、`feedback_loop_ready: false`、已尝试方式和所需输入；假设表保持为空，保留 `current_work` 后返回。不得继续阅读代码来构造根因理论。

**完成标准**：一条已运行命令快速、可重复、由 Agent 执行，并能在用户精确症状上变红。

### 2. 复现并最小化

运行回路确认捕获的是用户报告的故障。逐个删除输入、调用者、配置、数据和步骤，每次删除后重跑；只保留对红灯有负载作用的元素。非确定性 bug 通过并行、压力、固定时间/随机或缩小窗口提高到可调试复现率。

**完成标准**：剩余每个元素被移除都会使回路变绿，最小复现和最后红灯证据已持久化。

### 3. 假设与单变量探针

只有前两步完成后才加载 `<Path>{roots.workflows}/specdev/D-diagnose-bugs/hypothesis-and-instrumentation.md</Path>`。生成 3–5 个带预测的可证伪假设，先展示排名；用户 AFK 时保存 checkpoint 后继续。每个探针只检验一个预测，优先 debugger/REPL，其次定向日志；性能问题使用测量和分析器。

**完成标准**：根因由区分性实验确认，其他高排名候选有反证，所有临时探针有唯一清理标记。

### 4. 写入修复契约

使用 `<Path>{roots.workflows}/specdev/D-diagnose-bugs/diagnosis-template.md</Path>` 写入 diagnosis：触发条件、失败机制、影响范围、漏检原因、必须改变、必须保持、正确 seam、回归测试、非目标、风险和回滚。

存在正确 seam 时，把最小复现定义为 I 必须先观察红灯的回归测试合同；不存在正确 seam 时明确记录架构缺口并路由 R。D 不编写生产修复。

### 5. 清理、验证与路由

重跑原始未最小化回路，确认当前诊断结论可解释症状；搜索唯一 `[DEBUG-...]` 前缀并删除临时插桩，无法删除项登记 owner 与删除条件。运行：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --stage diagnosis \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

根因确认后将本 Work 加入 `works_run` 并清空 `current_work`，返回 diagnosis 和下一 Work：局部修复进入 Tickets/I，公共行为或高风险进入 S/Tickets，缺 seam 进入 R，仍无根因则保持 blocked 或进入 W。

## 完成标准

- 红灯回路硬门有已执行证据；
- 最小复现的剩余元素都有负载作用；
- 假设有排名、预测和反证；
- 根因解释触发、机制、漏检和影响；
- 修复契约决策完备但未夹带生产修复；
- debug 插桩已清理或有明确 owner；
- diagnosis、状态、验证证据和下一 Work 路径一致。

## 子文件引用

- 反馈回路：`<Path>{roots.workflows}/specdev/D-diagnose-bugs/feedback-loop.md</Path>`
- 假设与插桩：`<Path>{roots.workflows}/specdev/D-diagnose-bugs/hypothesis-and-instrumentation.md</Path>`
- 诊断模板：`<Path>{roots.workflows}/specdev/D-diagnose-bugs/diagnosis-template.md</Path>`
- HITL 模板：`<Path>{roots.workflows}/specdev/D-diagnose-bugs/scripts/hitl-loop.template.sh</Path>`
