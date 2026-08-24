---
id: specdev/spec
type: workflow-entry
workflow: specdev
name: 编写 Spec
description: 综合已知事实、设计决定、诊断与代码现状，产出以外部行为和验收合同为权威的 Ready Spec。
keywords: [spec, PRD, 用户故事, 验收合同, 接缝, 范围, readiness]
---

# 编写 Spec

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/specdev/README.md</Path>`，再执行本入口。

本 work 以“综合已有上下文”为主，不启动宽泛访谈。它保留原有的代码库探索、领域词汇、ADR 约束、测试接缝设计和用户确认能力，但将确认限制为真正影响外部行为或验证的高价值问题。

Spec 决定“为什么、为谁、系统应表现为何”。它可以锁定影响公共接口、数据、兼容、安全或验收的实现约束，但不写逐文件施工计划。

## 输入

按存在情况读取：

- `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- `<Path>{roots.state}/specdev/context/</Path>`
- `<Path>{roots.state}/specdev/adr/</Path>`
- 当前代码、测试、接口、schema、配置和运行事实。

不存在的可选工件静默跳过，不得把缺失内容当作已确认事实。

## 流程

### 1. Grounding 与事实探索

1. 汇总用户目标、受众、问题、限制和已有决定；
2. 只读探索相关代码、测试、配置、schema 和相邻实现；
3. 使用 `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>` 与 `<Path>{roots.state}/specdev/context/</Path>` 的术语，不自创冲突名称；
4. 使用 `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 与 `<Path>{roots.state}/specdev/adr/</Path>` 的已接受决策；
5. 按 `<Path>{roots.workflows}/specdev/common/rules/planning-principles.md</Path>` 区分可发现事实、高影响偏好和低影响实现细节；
6. 按 `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>` 处理冲突；
7. 外部依赖、标准或版本行为不清楚时使用 `<Path>{roots.workflows}/specdev/common/skills/research/SKILL.md</Path>`。

广泛的产品或架构取舍仍未确定时，返回 `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>`；不要在 Spec 中用猜测补齐。

### 2. 定义问题、用户和成功

从用户或调用者视角写明：

- 当前问题与影响；
- 目标用户、调用者或运营角色；
- 主要场景和现有痛点；
- 成功状态与可观察结果；
- 明确非目标。

目标不能只写“新增模块”“修改接口”或“完成 Ticket”。

### 3. 定义外部行为与范围

写明：

- 解决方案摘要；
- 正常路径；
- 边界和失败路径；
- 稳定错误行为；
- 状态转换和不变量；
- IN、REUSE、OUT；
- 需要保持的既有行为；
- 公共接口、数据、安全、迁移和运维影响。

局部文件组织、辅助函数和逐行实现不进入 Spec。

### 4. 设计验证接缝

优先复用现有稳定接缝。通常优先顺序是用户端到端行为、公共 API 或 CLI、事件或集成接缝、稳定单元接缝；实际层级由风险和项目先例决定，不机械追求最高层测试。

每个接缝写明：

- 入口位置和类型；
- 触发方式；
- 可观察结果；
- 覆盖哪些验收合同；
- 现有测试先例或命令。

若接缝选择会显著改变可测试性、事故半径或实现范围，向用户做一次聚焦确认；接缝可由代码和已有测试明确推导时，直接采用并记录依据，不为形式提问。

证据规则见 `<Path>{roots.workflows}/specdev/common/rules/evidence-and-verification.md</Path>`。

### 5. 编写 Spec

使用 `<Path>{roots.workflows}/specdev/S-spec/spec-template.md</Path>` 写入 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`。

稳定编号：

- `US-###`：用户故事；
- `AC-###`：验收合同；
- `NFR-###`：非功能要求；
- `DEC-###`：已锁定实现约束；
- `OOS-###`：明确超出范围。

不得虚构错误码、性能阈值、schema、迁移政策、法规或合规要求。项目代码证据使用项目相对 Path 标签。

### 6. Readiness Review

加载 `<Path>{roots.workflows}/specdev/S-spec/spec-readiness.md</Path>` 检查 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`。

任何会改变以下内容的未决问题都会使 `ready_for_tickets: false`：

- 外部行为和范围；
- 公共接口或数据；
- 安全、隐私、资金或数据完整性；
- 兼容、迁移和发布约束；
- 验收合同或验证接缝。

低影响、可逆实现默认值可以作为显式假设，但必须有验证方式。

### 7. 发布与路由

1. 对照 `<Path>{roots.workflows}/specdev/common/schemas/spec.schema.json</Path>`；
2. 运行：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --stage spec \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

3. 更新 `<Path>{roots.state}/specdev/status.json</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`；
4. 汇报主要用户故事、验收合同、范围、验证接缝、风险和 Ready 状态；
5. 返回 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`、Ready 状态及下一 Work 的完整路径；
6. 只有用户请求或工作流显式串联时，进入 `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>`。

## 完成标准

- `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` 已按模板写入；
- 问题、目标用户、外部行为、范围和非目标明确；
- 用户故事覆盖主要、边界、错误、角色和状态场景；
- 每个验收合同可观察、可判定并绑定验证接缝；
- 公共接口、数据、兼容、安全和迁移已决定或明确不适用；
- 高影响未决问题与 `ready_for_tickets` 一致；
- 不包含逐文件施工计划；
- Spec、Ready 状态和下一 Work 路径已返回；
- 状态和用户摘要已更新。

## 子文件引用

- Spec 模板：`<Path>{roots.workflows}/specdev/S-spec/spec-template.md</Path>`
- Ready 检查：`<Path>{roots.workflows}/specdev/S-spec/spec-readiness.md</Path>`
