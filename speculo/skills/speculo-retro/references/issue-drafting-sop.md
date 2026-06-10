# Issue Drafting SOP

把通过过滤的改进提案规范化成 issue-ready 结构、对照已存在 issue 去重、生成交给调用方 / `gh` 的交接字段。

## 提案字段（issue-ready）

每条提案产出以下结构化字段，调用方据此写报告并据此调 `gh`：

```jsonc
{
  "title":        "string, 见标题规范",
  "type":         "bug | enhancement | documentation | feature-request",
  "priority":     "priority:critical | priority:high | priority:medium | priority:low",
  "area":         "string|null, 例 area:commands / area:workflows / area:skills / area:cli / area:contract",
  "body":         "string, 见正文结构",
  "affected":     ["相对路径，例 speculo/commands/archive.md"],
  "evidence":     ["证据出处，例 .speculo/dev/<change>/.status.json#phase_history"],
  "disposition":  "file-issue | record-lesson | drop",
  "dup_of":       "number|null, 疑似重复的已存在 issue 编号"
}
```

## 标题规范

- 用祈使句描述「要改成什么」，不是「哪里坏了」：`命名` 区分度差 ❌ → `enhancement: 提升 command description 在系统提示里的区分度` ✅
- 前缀对齐类型：`bug:` / `enhancement:` / `docs:` / `feature:`
- 单行、可独立读懂、不超过约 70 字，含受影响的 asset 名。

## 类型 → 标签映射

复用 `../github-npm-ops/references/issue-pr-triage.md` 的标签体系，每条至少一个**类型**标签，外加**优先级**，可选**领域**：

| 提案 type | issue 类型标签 |
|-----------|---------------|
| `bug` | `bug` |
| `friction` | `enhancement` |
| `missing-capability` | `feature-request` |
| `doc-gap` | `documentation` |
| `ergonomics` | `enhancement` |

不确定改动方向的额外加 `needs-design`。

## 正文结构

每条 issue body 用固定小节，占位符填实，禁止空话：

```markdown
## 问题
[一句话说清痛点 / 不符合预期的行为。]

## 证据
[引用具体出处：对话节点、`.speculo/...` 产物路径、`.status.json` 字段、文档段落。可附最小复现。]

## 根因
[判断是 asset 设计 / 持久化契约 / 文档 / 工具问题，指明根因而非表象。]

## 建议改动
[改哪个 asset、怎么改。给相对路径与具体方向，不要泛泛而谈。]

## 验收标准
[可验证的完成判据，例如断言、命名、契约符合点。]

## 受影响资产
[列出相关相对路径。]
```

## 去重

起草后、交给调用方提交前，对每条做去重判定：

1. 提取标题与根因的关键词。
2. 由调用方用 `gh issue list --repo <owner/repo> --search "<关键词>" --state all --limit 20` 检索（机制见 `../github-npm-ops/references/issue-pr-triage.md`）。
3. 命中语义重复：把 `disposition` 设为 `drop` 或在 `dup_of` 记录已存在编号，默认不重复提；仅当用户明确要求才补提。

## 交接契约

本 skill 只返回上面的结构化提案清单 + 丢弃/合并说明，**不写文件、不调用 `gh`、不创建 issue**。落盘到 `.speculo/commands/<run>/report.md` 与实际 `gh issue create` 由调用方 command 在用户确认后执行。
