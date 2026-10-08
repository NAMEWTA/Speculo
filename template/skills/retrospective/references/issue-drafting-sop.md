# Issue Drafting SOP

把通过过滤的改进提案规范化成 issue-ready 结构、对照已存在 issue 去重、生成交给调用方 / `gh` 的交接字段。

## 提案字段（issue-ready）

每条提案产出以下结构化字段，调用方据此写报告并据此调 `gh`：

```jsonc
{
  "title":        "string, 见标题规范",
  "type":         "bug | friction | missing-capability | doc-gap | ergonomics",
  "priority":     "critical | high | medium | low",
  "area":         "string|null, 例 commands / workflows / skills / cli / contract",
  "body":         "string, 见正文结构",
  "remediation_axis": "code-defect | deterministic-check-gap | context-pointer | judgment-rule | environment-discovery",
  "regression":   {"positive": "通过样本与可观察结果", "negative": "拒绝/停止样本与不应出现的副作用"},
  "affected":     ["相对路径，例 speculo/commands/archive-and-consolidate.md"],
  "evidence":     ["证据出处，例当前会话节点或具体工件及段落"],
  "disposition":  "file-issue | lesson-only | discard | duplicate",
  "dup_of":       "number|null, 疑似重复的已存在 issue 编号"
}
```

## 标题规范

- 用祈使句描述「要改成什么」，不是「哪里坏了」：`命名` 区分度差 ❌ → `enhancement: 提升 command description 在系统提示里的区分度` ✅
- 前缀对齐类型：`bug:` / `enhancement:` / `docs:` / `feature:`
- 单行、可独立读懂、不超过约 70 字，含受影响的 asset 名。

## 分类与标签

只返回语义类型、优先级与领域；标签名称、存在性、创建权限和映射由调用方决定，不要求每个仓库都具备某套标签。不确定改进方向时记录设计缺口，不自行增加远程标签。

## 正文结构

每条 issue body 用固定小节，占位符填实，禁止空话：

```markdown
## 问题
[一句话说清痛点 / 不符合预期的行为。]

## 证据
[引用具体出处：对话节点、`<Path>{roots.state}/...</Path>` 产物路径、`.status.json` 字段、文档段落。可附最小复现。]

## 根因
[判断是 asset 设计 / 持久化契约 / 文档 / 工具问题，指明根因而非表象。]

## 建议改动
[改哪个 asset、怎么改。给相对路径与具体方向，不要泛泛而谈。]

## 验收标准
[可验证的完成判据、通过/拒绝样本、回归命令与未验证项。机械问题写确定性检查，不以新增提示词代替测试。]

## 受影响资产
[列出相关相对路径。]
```

## 去重

起草后、交给调用方提交前，对每条做去重判定：

1. 提取标题与根因的关键词。
2. 由调用方用 `gh issue list --repo <owner/repo> --search "<关键词>" --state all --limit 20` 检索；Skill 自身不执行远程检索。
3. 命中语义重复：把 `disposition` 设为 `duplicate` 并在 `dup_of` 记录已存在编号，默认不重复提；仅当用户明确要求才补提。

## 交接契约

本 skill 只返回结构化提案清单与丢弃/合并说明，**不写文件、不调用 `gh`、不创建 issue**。command 或 Work 选择自己的报告路径、标签和授权方式；无发现与证据不足同样是有效分析结果。
