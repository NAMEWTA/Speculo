# 知识毕业标准

判定变更中的知识是否值得提取到 specdev 的永久知识库（`adr/`、`context/`、`research/`）。默认只提取满足标准的；其余归为 `ephemeral`，留在归档变更中供未来按需查阅。

## 毕业标准（三项满足任一即提取）

1. **稳定机制**：知识描述的是持久架构模式、设计原则或系统约束，不是临时实现细节或过渡方案。
   - ✅ "认证模块使用 JWT + refresh token 双令牌机制"
   - ❌ "临时绕过了 rate limiter，等待 PR #342 合并后移除"

2. **重复教训**：同一洞察在多个变更中出现（>1 个变更引用或触及）。
   - ✅ 三个不同变更都遇到"时区转换必须用 UTC 存储、展示层转换"的坑
   - ❌ 仅在一个变更的调试过程中发现，未被其他变更证实

3. **接手者必知**：缺少此知识会导致后续开发者做出错误决策或重复已解决的争论。
   - ✅ "选择 PostgreSQL 而非 MongoDB 的原因：需要 ACID 事务和 JSONB 的混合查询能力"
   - ❌ "lint 配置将 max-line-length 设为 120 而非 100"

## 反毕业标准（满足任一项则不提取）

- 仅适用于单次变更的实现细节（具体行号、临时变量名、中间重构步骤）
- 已解决的临时变通方案（workaround 已被正式修复取代）
- 调试日志、故障排查过程记录（除非提炼出可复用的诊断方法）
- 变更自身的 ADR.md 已充分捕获的决策（不重复提取）
- 脱离完整变更上下文会产生误导的内容
- 纯个人偏好且无项目级约束力

## 决策流程

对每段待评估知识：

```
1. 满足任一毕业标准？ → 否 → ephemeral（留在归档变更）
2. 触发任一反毕业标准？ → 是 → ephemeral
3. 提取 → 进入目标知识库的比对与合并
```

## specdev 三文件模型映射

specdev 每个变更遵循三文件模型（参见 `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>`）。知识提取按以下映射：

| 来源文件 | 知识类型 | 判定特征 | 目标知识库 |
|---------|---------|---------|-----------|
| **ADR.md** | 架构决策 | `## NNNN: Title` 条目，满足三条件（不可逆 + 令人意外 + 真实权衡） | `<Path>{roots.state}/specdev/adr/</Path>` |
| **CONTEXT.md** | 领域术语 | `**术语名**：定义` + `_Avoid_` 条目，项目特有概念 | `<Path>{roots.state}/specdev/context/</Path>` |
| **LOG.md** | 设计决策 | `LOG-XXXX: accepted` 条目，满足 ADR 三条件但未正式记录 → 提升为 ADR | `<Path>{roots.state}/specdev/adr/</Path>` |
| **research/** | 研究产物 | 跨变更相关的研究发现（>1 变更引用或覆盖共享技术栈） | `<Path>{roots.state}/specdev/research/</Path>` |

## Ephemeral 分类

被判定为 `ephemeral` 的知识**不删除**——它随归档变更保留在 `<Path>{roots.state}/specdev/archive/<YYYY-MM>/<change>/</Path>` 中，供未来按需查阅。只是不提升到 workflow 级永久知识库。
