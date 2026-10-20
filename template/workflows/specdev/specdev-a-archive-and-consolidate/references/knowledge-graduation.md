# Knowledge Graduation Criteria

判定 change 中的知识是否值得提取到 workflow state root 声明的持久化 store。默认只提取满足标准的；其余归为 `ephemeral`，留在归档 change 中。

## 毕业标准（三项满足任一即提取）

1. **稳定机制**：知识描述的是持久架构模式、设计原则或系统约束，不是临时实现细节或过渡方案。
   - ✅ "认证模块使用 JWT + refresh token 双令牌机制"
   - ❌ "临时绕过了 rate limiter，等待 PR #342 合并后移除"

2. **重复教训**：同一洞察在多个 change 中出现（>1 个 change 引用或触及）。
   - ✅ 三个不同 change 都遇到"时区转换必须用 UTC 存储、展示层转换"的坑
   - ❌ 仅在一个 change 的调试过程中发现，未被其他 change 证实

3. **接手者必知**：缺少此知识会导致后续开发者做出错误决策或重复已解决的争论。
   - ✅ "选择 PostgreSQL 而非 MongoDB 的原因：需要 ACID 事务和 JSONB 的混合查询能力"
   - ❌ "lint 配置将 max-line-length 设为 120 而非 100"

## 反毕业标准（满足任一项则不提取）

- 仅适用于单次 change 的实现细节（具体行号、临时变量名、中间重构步骤）。
- 已解决的临时变通方案（workaround 已被正式修复取代）。
- 调试日志、故障排查过程记录（除非提炼出可复用的诊断方法）。
- 脱离完整 change 上下文会产生误导的内容。
- 纯个人偏好且无项目级约束力（"我习惯用 X"）。

## 候选去重

同一决定已由 <Path>{roots.state}/specdev/changes/{change}/ADR.md</Path> 充分捕获时，以该 ADR 作为唯一毕业候选，不再从 LOG、Evidence 或其他工件生成重复候选。这只消除重复，不跳过永久知识毕业评估；通过标准的 change ADR 仍应进入永久 `adr/` 合并计划。

同一设计结论已由 change DESIGN.md 捕获时，以其稳定规则 ID 为唯一设计候选，LOG/原型/Evidence 只作为来源。只有证据明确支持的规则才可标为 implemented；页面批准与 completed 状态都不是生产实现证据。首次基线 bootstrap 是 A 设计网关规定的 approved-intent 例外，不放宽其他知识的毕业标准。

## 决策流程

对每段待评估知识：

```
1. 满足任一毕业标准？ → 否 → ephemeral（留在归档 change）
2. 触发任一反毕业标准？ → 是 → ephemeral
3. 提取 → 进入合并计划
```

## 知识分类与目标映射

新 ADR/context 对象使用 `YYYY-MM-DD-topic[-NN]` 稳定名称；已有编号/历史名称原位保留，不批量重命名。目标目录须由领域声明。

| 知识类型 | 判定特征 | 目标 store |
|---------|---------|-----------|
| **架构决策** | 对未来有持续决策价值，保留真实取舍与依据；不要求三项特征同时满足 | `<Path>{roots.state}/specdev/adr/{date}-{topic}[-NN].md</Path>` |
| **领域术语** | 项目特有的概念定义，不是通用编程术语 | `context/` 目录（合并到术语文件） |
| **项目设计规则** | 可跨 change 复用且通过证据评估的 tokens、组件与交互约束 | 仅已声明的 SpecDev `design/`，由 A 设计网关处理 |
| **领域模型/规则/教训** | 实体关系、显式约束、踩坑经验 | 若 领域 Skill/manifest 声明了对应 store 则映射；否则归入 `adr/`（作为决策记录）或保留 ephemeral |

> **注意**：目标 store 以 领域 Skill/manifest 持久化约定的实际声明为准。上表为默认映射。若 workflow 未声明某个 store，对应知识归入最接近的已声明 store 或保留 ephemeral。

## Ephemeral 分类

被判定为 `ephemeral` 的知识**不删除**。它随归档 change 保留在<Path>{roots.state}/specdev/changes/archive/{change}/</Path>，供未来按原 locator 查阅。它不提升到 workflow 级持久化 store。
