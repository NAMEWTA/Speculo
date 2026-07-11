# Friction Taxonomy SOP

复盘 Speculo 使用摩擦时的信号来源、分类法、优先级评分与噪声过滤规范。

## 信号来源清单

按以下顺序采集原始摩擦点，每条记录**证据出处**（文件路径或对话节点），后续起草 issue 时要引用：

1. **当前对话上下文** —— 本次会话激活过的 command / workflow；用户在哪一步卡住、追问、返工；为绕开限制做了哪些手动动作；哪些指令被误解。
2. **命令产物** —— `speculo/.speculo/commands/<command>/*.md`：其中记录的验证失败、未完成和阻塞点是一手摩擦。
3. **change 状态机** —— `speculo/.speculo/<workflow>/changes/<change>/.status.json` 的 `phase_history`：
   - `revisited` —— phase 被迫回退，通常意味着流程设计或前置产物有缺口
   - `blocked` —— 卡点，记录阻塞原因
   - `skipped` —— phase 被跳过，可能是冗余或不适用
   - `updated_at` 长期停滞 —— 流程让人不想推进
4. **change 产物正文** —— `prd.md`、`tdd-*.md`、`slices.md`、`diagnosis.md` 中显式写下的「待澄清」「风险」「TODO」。
5. **沉淀教训** —— 各 workflow 声明的 lessons/knowledge store：已记录但尚未转成改进项的教训，用于去重与佐证频率。
6. **契约落差** —— 实际产物路径、frontmatter、命名是否偏离 `persistence-contract`：路径散落、缺字段、命名不合 `YYYY-MM-DD-<kebab>` 都是 bug 信号。

## 摩擦类型分类

每个摩擦点归且仅归一个**主类型**：

| 类型 | 含义 | 典型表现 |
|------|------|---------|
| `bug` | 资产行为不符合契约或文档 | 产物写错位置、`.status.json` 缺字段、命令覆盖了用户改动 |
| `friction` | 能用但别扭、步骤冗余、易错 | 反复手动改路径、phase 频繁 `revisited`、确认环节缺失 |
| `missing-capability` | 缺一个本该有的 command/workflow/skill | 用户手动拼凑某个反复出现的流程 |
| `doc-gap` | 文档缺失、过时或与实现不符 | 指引说一套、资产做另一套；找不到用法 |
| `ergonomics` | 命名、触发词、措辞、可发现性 | description 区分度差、关键词命中不到、术语不一致 |

## 优先级评分

优先级 = **影响面 × 发生频率**，落到四档（复用 `github-npm-ops` 标签体系）：

- 影响面：`broad`（影响所有使用者 / 破坏契约）｜`partial`（影响部分流程）｜`cosmetic`（轻微体验）
- 发生频率：`recurring`（多次出现 / 多来源佐证）｜`occasional`｜`one-off`

| 优先级 | 判定 |
|--------|------|
| `priority:critical` | 破坏契约、数据/产物丢失、覆盖用户改动 —— 无论频率 |
| `priority:high` | `broad` 影响且 `recurring`，或显著阻塞主流程 |
| `priority:medium` | `partial` 影响，或 `broad` 但仅 `occasional` |
| `priority:low` | `cosmetic`，或 `one-off` 且有 workaround |

## 噪声过滤规则

不是每个摩擦点都该变成 issue。按以下规则收敛：

- **合并** —— 语义重复的多条合成一条，频率累加（提升优先级佐证）。
- **丢弃** —— 纯属本次会话一次性、不可复现、或已被其他提案覆盖的，标注「丢弃」并写明原因。
- **降级为教训** —— 属于「用法/约定」而非「资产缺陷」的，建议记入 `LESSONS.md` 而非提 issue。
- **可行动性闸门** —— 无法描述出「改哪个 asset、怎么改、怎么验收」的，先标 `needs-design`，不要凭空提模糊 issue。

只把通过闸门、`priority:medium` 及以上、或 `recurring` 的高信号项推进到 issue 起草。
