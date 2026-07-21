# Work Entry Authoring Reference

本参考是 work 入口文件撰写的完整规范——从格式、命名、frontmatter 到渐进披露、持久化和质量审计。信息综合自 workflow-authoring.md、persistence-contract.md、authoring-quality.md 和 writing-great-skills。

## 格式边界

Workflow 包内所有文件为纯自然 markdown，不使用 XML 块。所有跨文件引用使用 `<Path>{roots.xxx}/...</Path>` 格式，根别名来自 workspace.json：

| 别名 | 解析路径 |
|------|---------|
| `{roots.agents}` | `.agents/` |
| `{roots.skills}` | `speculo/skills/` |
| `{roots.workflows}` | `speculo/workflows/` |
| `{roots.state}` | `speculo/.speculo/` |
| `{roots.vendor}` | `speculo/vendor/` |
| `{roots.commands}` | `speculo/commands/` |

## Work 条目命名

- 目录：`<大写字母>-<work_name>/`（大写字母 + 连字符 + kebab-case work 名）
- 入口文件：与目录同名，如 `G-grill-with-docs/G-grill-with-docs.md`
- `<大写字母>` 前缀支持 @ 触发（如 `@G-grill-with-docs`）
- 同一 workflow 下 work 目录名不可重复

## Frontmatter

```yaml
---
id: <workflow>/<work-name>     # work-name 为 kebab-case，如 specdev/grill-with-docs
type: workflow-entry            # 固定值
workflow: <workflow>            # 所属 workflow 目录名
name: <中文显示名>               # 与主导词一致
description: <一句话描述>         # 包含主导词和核心行为
keywords: [<主导词>, ...]         # YAML 数组
---
```

`id` 格式为 `<workflow>/<work-name>`（斜杠分隔）。`type` 始终为 `workflow-entry`。

## 正文结构

### `## 流程`（必需）

编号步骤，每个步骤以内联完成标准结尾：

```markdown
1. 执行某操作。引用子文件 `<Path>{roots.workflows}/<workflow>/<work>/sub-file.md</Path>`。
   **完成标准**：<可检查的条件>
```

- 每个步骤必须有完成标准——agent 能否区分完成和未完成？
- 关键步骤必须穷尽："每个修改过的模块都已覆盖"而非"生成一个变更列表"
- 步骤通过 `<Path>` 指针引用子文件和外部材料
- 写作风格精简——每句都要改变模型的默认行为

### `## 子文件引用`（必需）

表格，列：文件 | 内容 | 触发条件

**渐进披露模式**的表格示例：

```markdown
| 文件 | 内容 | 触发条件 |
|------|------|---------|
| `<Path>{roots.workflows}/specdev/G-grill-with-docs/grilling-protocol.md</Path>` | 访谈协议 | 进入步骤 2「访谈」时加载 |
| `<Path>{roots.workflows}/specdev/G-grill-with-docs/domain-modeling-rules.md</Path>` | 领域建模规则 | 进入步骤 3「领域建模」时加载 |
```

**单文件模式**的表格仅列产物输出路径和上游输入引用：

```markdown
| 文件 | 内容 | 触发条件 |
|------|------|---------|
| `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` | 规格输出 | 步骤 2 完成后写入 |
| `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>` | 上游上下文 | 步骤 1 读取 |
```

### `## 依赖关系`（可选）

如果此 work 依赖其他 work 的产物，在此声明：

```markdown
- 依赖 G-grill-with-docs 产出的 `ADR.md`（步骤 1 读取）
- 依赖 G-grill-with-docs 产出的 `CONTEXT.md`（步骤 2 读取）
```

## 两种结构模式

### 单文件模式

- 所有步骤内联在入口文件的 `## 流程` 中
- 适合：步骤少（≤5）、流程线性、无分支场景
- `## 子文件引用` 仅列产物输出路径和上游输入引用
- 示例：`S-spec/S-spec.md`（编写 Spec）、`T-tickets/T-tickets.md`（拆分 Tickets）、`W-wayfinder/W-wayfinder.md`（寻路）

### 渐进披露模式

- 入口只保留每条分支都需要的步骤（控制在 50 行以内）
- 分支专属细节（规则、协议、模板）放在子文件中
- 子文件通过 `## 子文件引用` 表的触发条件按需加载
- 适合：多分支、每个分支有大量专属细节、或后续步骤诱发过早完成
- 示例：`G-grill-with-docs/`（6 个子文件）、`I-implement/`（6 个子文件）、`I-init-setup/`（3 个子文件）

## 子文件规则

- 每个子文件覆盖恰好一个分支——一组触发条件相同的规则、流程或参考
- 命名用描述性 kebab-case（如 `grilling-protocol.md`、`tdd-rules.md`），不使用编号
- 子文件内任意 markdown 结构（编号列表、表格、代码块），不使用 XML 块
- 内容和入口触发条件一致——入口的引用表中声明的触发条件必须精确匹配步骤中的引用位置
- 子文件不应独立于入口被加载——其存在和触发条件仅在入口的引用表中声明
- 就近放置：定义、规则、注意事项放在同一标题下

## 持久化

- Work 产物写入 `_state/changes/<change>/`，`<change>` 为 `YYYY-MM-DD-<kebab-topic>` 格式
- 产物路径使用 `<Path>{roots.state}/<workflow>/changes/{change}/<file>.md</Path>`
- 不写入 `.speculo/` 全局目录
- 典型产物：`ADR.md`、`LOG.md`、`CONTEXT.md`、`spec.md`、`tickets.md`、`map.md`
- `_state/` 固定骨架：`status.json`、`changes/`、`archive/`（由 speculo-write-workflows 管理，本 skill 不负责创建）
- `docs-sync.json` 是 command 拥有的延迟 sidecar，不得放入 `_state/`

## 写作规则

### 主导词

- 一个紧凑概念锚定 work 的全部行为——优先选择模型预训练中已有的概念
- 在 frontmatter `name`、`description` 和正文步骤中反复出现以锚定执行
- 同一 workflow 下两个 work 不能共享同一个主导词
- 好的例子："设计访谈"、"规格"、"便签拆分"、"寻路"、"实现"

### 完成标准

- 每个步骤以一个可检查的完成标准结尾——agent 能否区分完成和未完成？
- 关键步骤穷尽："每个修改过的模块都已覆盖"而非"生成一个变更列表"
- 模糊标准引发过早完成——agent 注意力滑向"完成状态"而非"真正完成"

### 措辞

- 正面措辞——陈述目标行为，不使用"不要/禁止/切勿"
- 精简——每句都要改变模型的默认行为，否则是无效操作，应删除
- 保持单一事实来源——同一含义只出现在一个位置

## 质量审计清单

撰写完成后逐项检查：

| 审计项 | 检查方式 |
|--------|---------|
| 相关性 | 逐句检查——这句仍影响此 work 的行为吗？删除无关陈述 |
| 无效操作 | 逐句检查——这句改变了模型的默认行为吗？删除"agent 本来就会做的事" |
| 重复 | 同一含义是否出现在多个位置？收拢到单一权威位置 |
| 沉积 | 是否有因"删了感觉不安全"而保留的过时内容？删除不再使用的规则和引用 |
| 蔓延 | 入口文件是否过长（>50 行）？将可下推的参考内容移入子文件 |
| 信息层级 | 入口是否只保留了每条分支都需要的步骤？分支细节是否全部在子文件中？ |
| 完成标准 | 每个步骤的完成标准是否可检查？关键步骤是否穷尽？ |
| 否定措辞 | 是否有"不要/禁止/切勿"？替换为正面目标陈述，仅安全边界可保留禁令 |

## 失败模式

| 模式 | 描述 | 防御 |
|------|------|------|
| 过早完成 | 步骤未真正完成就结束，注意力滑向"完成状态" | 锐化完成标准；仅当标准不可简化模糊*且*观察到仓促时，通过按顺序拆分子文件隐藏完成后步骤 |
| 重复 | 同一含义出现在多处，增加维护成本和 token 消耗 | 收拢到单一权威位置 |
| 沉积 | 陈旧层堆积——增加安全、删除危险的心理 | 每次编辑后逐句检查相关性；激进删除过时内容 |
| 蔓延 | 入口过长损害可读性 | 信息层级——参考披露到指针后，按分支拆分 |
| 无效操作 | 模型默认就会遵守的行 | 逐句测试：它改变了默认行为吗？删除答案是否定的句 |
| 否定 | 通过禁止来引导适得其反——命名了禁止行为 | 正面陈述目标行为；仅安全边界保留禁令，且必须成对提供替代行为 |
