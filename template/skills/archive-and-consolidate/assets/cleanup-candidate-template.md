# Cleanup Candidates

> 生成时间：<YYYY-MM-DD HH:MM>
> Workflow：<workflow-name>
> 扫描 store 数：<N>
> 候选总数：<N>

## 分类摘要

| 分类 | 数量 |
|------|------|
| delete | <N> |
| merge | <N> |
| rewrite | <N> |
| keep | <N> |
| needs-confirmation | <N> |

---

## Delete 候选

| # | 文件/条目 | 理由 | 风险 | 最后引用日期 |
|---|----------|------|------|------------|
| 1 | `adr/0001-old-auth.md` | superseded by ADR-0003，>30 天无 active 引用 | low | 2026-06-01 |
| 2 | `context/legacy-term.md` | 代码和 archive 中无引用证据 | low | — |

---

## Merge 候选

| # | 源 | 目标 | 理由 |
|---|-----|------|------|
| 1 | `adr/0002-timeout.md` | `adr/0005-timeout-v2.md` | 主题相同（超时处理），0005 更完整，合并并注明来源 |
| 2 | `context/` 中重复的规则描述 | `adr/` 对应决策 | 保留 adr/ 为权威版本，context/ 中改为指针 |

---

## Rewrite 候选

| # | 文件/条目 | 当前问题 | 建议改写 |
|---|----------|---------|---------|
| 1 | `context/terms.md#term:Session` | 含相对时间"两个月前上线" | 改为绝对日期"2026-05-15 上线" |
| 2 | `adr/0002-caching.md` | 格式不符合 ADR 模板 | 补全"后果"部分 |

---

## Needs-Confirmation 候选

| # | 文件/条目 | 冲突/问题 | 选项 |
|---|----------|----------|------|
| 1 | `context/terms.md#max-retry` | 规则"最多重试 3 次"与 change 中"建议 5 次"矛盾 | A) 保留 3 次 B) 改为 5 次 C) 按场景区分 |
| 2 | `context/terms.md#term:Token` | 定义"JWT access token"与 change 中"包括 refresh token"不一致 | A) 扩大定义 B) 拆分为两个术语 |

---

## Keep（保留，无动作）

| # | 文件/条目 | 保留原因 |
|---|----------|---------|
| 1 | `adr/0003-jwt-auth.md` | 创建不足 30 天，仍为现役决策 |
| 2 | `context/terms.md` | 仍被变更和代码引用 |

---

## 反模式标记

| # | 位置 | 反模式 | 建议 |
|---|------|--------|------|
| 1 | `context/terms.md` 顶部 | "2026-03-01 上线 v2，详见..." 历史叙事 | 纯历史迁 CHANGELOG；现役约束就地融合 |
