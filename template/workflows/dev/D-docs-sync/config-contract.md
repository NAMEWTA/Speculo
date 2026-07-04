# .config 知识资产同步契约

本契约用于 `dev/D-docs-sync` 审计和更新 `speculo/.speculo/.config/`。它只规定 docs-sync 的同步边界；术语和 ADR 的格式单一事实源仍是 `../M-domain-modeling/CONTEXT-FORMAT.md` 与 `../M-domain-modeling/ADR-FORMAT.md`。

## 覆盖范围

- `speculo/.speculo/.config/RULES.md`
- `speculo/.speculo/.config/LESSONS.md`
- `speculo/.speculo/.config/context/**/*.md`
- `speculo/.speculo/.config/adr/**/*.md`

## 通用生命周期动作

每次审计都把候选项标记为以下之一：

| 动作 | 含义 |
|------|------|
| `add` | 当前代码、文档或归档产物出现了新的稳定知识，应新增 |
| `update` | 旧内容仍有价值但与当前事实不一致，应改写 |
| `delete` | 内容已过期、重复、空置或被取代，应删除或转交 prune |
| `keep` | 内容仍准确且有当前证据支撑 |
| `propose-only` | 需要用户确认或领域建模确认，暂不写文件 |

禁止只追加内容。旧事实、旧引用、重复条目和空模板必须被审计。

## RULES.md

`RULES.md` 是用户维护的硬约束库。

- docs-sync 必须读取并遵守。
- docs-sync 可以在 report 中提出增删改建议。
- 只有用户明确确认具体规则改动时，才可写入 `RULES.md`。
- 不能把一次性任务偏好、临时 workaround 或尚未验证的经验写成规则。

## LESSONS.md

`LESSONS.md` 记录跨任务可复用经验。

- 可追加来自归档复盘、诊断、发布失败、重复踩坑的高信号经验。
- 可删除或合并重复、过时、单次任务专属、已被规则/ADR 吸收的条目。
- 每条经验应能说明“以后遇到什么条件时如何行动”，不要记录流水账。
- 如果只影响当前 change，把内容留在 change 产物中，不写入 LESSONS。

## CONTEXT

CONTEXT 是项目通用语言，不是实现说明、PRD 或决策日志。

- 只沉淀项目领域特有术语，不写通用编程词。
- 术语定义最多一到两句话。
- 同一概念多名、用户用词冲突、上下文边界不清时，必须调用 `../M-domain-modeling/M-domain-modeling.md` 确认。
- 当前代码或 ADR 反转术语含义时，更新或删除旧定义；不要保留双重定义。

## ADR

ADR 记录难以逆转、缺上下文会令人意外、存在真实权衡的决策。

- ADR 引用必须指向真实存在的 ADR 文件。
- ADR 被取代时，旧 ADR 顶部必须有 superseded 标注，并指向新 ADR。
- ADR 索引或 README（若项目存在）必须与实际文件、状态、取代链一致。
- 已被物理删除的 ADR 引用必须删除、改为新 ADR，或在 report 中标记为阻塞。
- 新 ADR 或取代链写入前，按 `../M-domain-modeling/ADR-FORMAT.md` 判断是否值得记录。

## 删除与 Prune

docs-sync 可以直接删除 tracked 文档中的过期段落；对 `.config` 文件级删除默认进入 `../../../commands/config-prune.md --dry-run` 候选。

可进入 prune 候选的典型情况：

- 被取代超过 30 天且无活跃引用的 ADR。
- 指向不存在 ADR 的索引行或正文引用。
- 空置占位文件或只含 TODO 的长期资产。
- CONTEXT 中已无代码、文档或归档证据支撑的术语。
- LESSONS 中重复或被 RULES/ADR 吸收的经验。

删除 `.config` 文件或 RULES 条目前必须有用户明确确认。
