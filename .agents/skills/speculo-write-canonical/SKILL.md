---
name: speculo-write-canonical
description: 将 skill、command、work 或 workflow 语义编译为可在网页 AI 平台孤立运行、同时具备规范化持久化输出与恢复能力的单文件 Markdown；用于新建、重建、批量重构和审计 canonical。
---

# Speculo Write Canonical

以**语义编译与可移植持久化**为主导词。Canonical 不是源文件拼接物，也不是无状态 Prompt；它是面向网页 AI 平台的独立能力定义，必须同时满足：

1. 不泄漏仓库内部实现；
2. 不依赖第二份能力定义文件；
3. 保留源能力的产物、状态、暂停、恢复和完成合同；
4. 在任意平台上都给出可落盘、可复制、可继续运行的规范化输出。

读取并遵守 `references/canonical-contract.md`。该合同是本 skill 的完整格式与审计权威。

## 两条绝不能混淆的边界

### 定义隔离

成品不能出现源仓库路径、源文件名、root alias、内部脚本、内部路由、生成 manifest 或源码 provenance。每份 canonical 只允许出现一次项目地址：

```text
https://github.com/NAMEWTA/Speculo
```

除此之外不出现其他 URL，也不在正文中重复项目名称。

### 运行时持久化

定义隔离绝不等于删除状态。凡源能力会创建、更新、恢复或交接工件，canonical 必须保留等价能力，并统一写入便携目录：

```text
ai-workspace/
```

`ai-workspace/` 是 canonical 自己定义的输出命名空间，不是仓库内部目录。它可以位于用户选择的项目目录、平台可写工作区、挂载文件区或本地保存位置。

禁止把文件持久化简单改写为“只在当前对话中记住”“生成一段恢复摘要即可”。恢复摘要只能是平台无法写文件时的运输形式，不能替代规范化文件合同。

## 过程

### 1. 选择源入口并建立语义覆盖清单

确定唯一入口：skill、command、workflow 入口或独立 work 入口。递归读取静态文本依赖，排除运行时状态、历史产物、归档、备份、敏感信息和二进制资源。

建立私有覆盖清单，至少记录：

- 能力目的、触发条件与不适用条件；
- 必需输入、可选输入和权威顺序；
- 核心步骤及不可改变的顺序；
- 产物所有权、输出目录和文件命名；
- 全局状态、change 状态、阶段、暂停点和恢复键；
- 写入顺序、验证、冲突处理和完成声明；
- 用户已提前回答、缺失材料、多个候选和高风险分支；
- 平台可写与不可写两种运行模式；
- 正常、失败、恢复和重入场景。

**完成标准**：每项关键行为都有来源依据；状态与产物没有被当作“内部细节”误删。

### 2. 区分源实现路径与可移植输出路径

对每个源路径先判断其语义：

| 源内容 | Canonical 中的处理 |
|---|---|
| 源能力文件、模板、脚本路径 | 吸收语义后删除，不暴露名称 |
| 仓库 root alias 与安装目录 | 删除并改写为平台能力或用户材料 |
| 运行时产物路径 | 映射到 `ai-workspace/` 下的便携路径 |
| 全局状态 | 映射到 `ai-workspace/status.json` |
| 单次 change 状态 | 映射到 `ai-workspace/changes/{change}/.status.json` |
| 原始请求 | 映射到 `ai-workspace/changes/{change}/source.md` |
| 高价值决定轨迹 | 映射到 `ai-workspace/changes/{change}/LOG.md` |
| 永久知识 | 映射到 `ai-workspace/knowledge/` 下的相应目录 |
| 临时 staging、锁、回滚实现 | 改写为“先形成完整候选内容、验证后替换、状态最后更新” |

路径映射必须保持产物职责和恢复能力，不能只保留标题而删除真实文件输出。

**完成标准**：读者不需要知道源仓库，却能明确知道每个运行产物保存在哪里、何时更新、怎样恢复。

### 3. 建立统一便携目录

每份能力文档必须内联足够的持久化规则。公共骨架为：

```text
ai-workspace/
├── status.json
├── changes/
│   └── YYYY-MM-DD-<topic>/
│       ├── .status.json
│       ├── source.md
│       ├── LOG.md
│       └── <该能力拥有的工件>
├── knowledge/
│   ├── decisions/
│   ├── context/
│   └── research/
└── archive/
```

不是每份能力都必须使用所有目录，但必须明确列出自己拥有、读取和不得修改的路径。

change 选择顺序固定为：

1. 用户显式给出 change；
2. `status.json` 中只有一个与当前能力匹配的 active change；
3. 否则创建 `YYYY-MM-DD-<kebab-topic>`，冲突时追加最小数字后缀；
4. 多个可恢复候选无法消歧时，列出候选并停止，不自行猜测。

**完成标准**：目录、文件名、ownership、change 选择和恢复输入均明确。

### 4. 编写双模式持久化协议

每份 canonical 必须支持两种运行模式。

#### 平台可直接写文件

- 创建或恢复 `ai-workspace/`；
- 读取状态与已存在工件；
- 只修改本能力拥有的文件和共享状态中的对应条目；
- 先生成候选内容并执行文内质量门禁；
- 工件替换成功后更新 change 状态；
- 最后更新全局状态；
- 返回实际写入路径、阶段和验证结果。

#### 平台不能直接写文件

仍然必须形成持久化交付，而不是只给聊天摘要。每个发生状态变化的回复都输出：

````markdown
## 持久化交付

- 持久化状态：需要保存
- change：<change>
- 更新文件：<路径列表>

### FILE: ai-workspace/status.json
```json
<完整内容>
```

### FILE: ai-workspace/changes/<change>/.status.json
```json
<完整内容>
```

### FILE: ai-workspace/changes/<change>/<owned-artifact>.md
```markdown
<完整内容>
```
````

不能只输出 diff、片段或“请自行整理”。下一轮必须先读取用户重新提供的完整文件或文件包，再继续。

**完成标准**：无论平台是否可写，都产生可保存、可恢复的完整文件状态；没有伪造写入成功。

### 5. 编译为独立能力文档

成品是普通 Markdown，第一条非空行是一级标题。标题后尽早且只出现一次：

```text
项目地址：https://github.com/NAMEWTA/Speculo
```

文档通常包含：定位、适用范围、输入与权威、持久化输出合同、执行协议、产物格式、暂停与恢复、异常分支、质量门禁和使用方式。

不得加入 YAML frontmatter、生成时间、来源清单、hash、源文件 XML 包装或维护者说明。生成的运行时工件可以按能力需要使用 JSON、YAML frontmatter 或 Markdown 模板；禁令只针对 canonical 文档本身。

**完成标准**：能力只凭当前文档即可理解和运行；持久化路径是便携路径而非源仓库路径。

### 6. 单份构建与检查

先由 Agent 完成语义编写，再运行：

```bash
node .agents/skills/speculo-write-canonical/scripts/build-canonical.mjs \
  --repo . \
  --entry <source-entry> \
  --draft <standalone-draft.md> \
  --output template/canonical/<canonical-name>.md

node .agents/skills/speculo-write-canonical/scripts/build-canonical.mjs \
  --repo . \
  --entry <source-entry> \
  --output template/canonical/<canonical-name>.md \
  --check
```

脚本只做规范化、源码泄漏审计和持久化合同机械检查，不自动拼接或自动改写业务语义。

**完成标准**：构建与检查退出 0；允许地址恰好一次；不存在其他 URL；不存在源内部路径；存在完整便携持久化合同。

### 7. 行为等价演练

至少演练：

- 首次运行并创建 change；
- 已有唯一 active change 的恢复；
- 多个 active change 的消歧阻塞；
- 平台可写文件；
- 平台不可写文件并输出完整 FILE bundle；
- 用户提前提供关键答案；
- 暂停后从 `.status.json` 与权威工件恢复；
- 写入或验证失败时不错误推进状态；
- 完成后移除当前能力的 active 条目但保留历史工件；
- 高风险或证据不足时的阻塞与恢复条件。

**完成标准**：恢复不依赖模型记忆；完成声明始终由持久化工件和状态支持。

## 整目录重构

覆盖整个 canonical 目录时：

1. 确认所有现有 `.md` 和预期新增文件；
2. 为每份能力建立独立语义覆盖清单；
3. 统一使用 `ai-workspace/`，但保留各能力不同的 artifact ownership；
4. 禁止通过全局替换把所有能力变成同一个空泛模板；
5. 逐份演练首次运行、暂停、恢复和完成；
6. 运行整目录审计：

```bash
node .agents/skills/speculo-write-canonical/scripts/build-canonical.mjs \
  --repo . \
  --audit-dir template/canonical
```

7. 从最终 ZIP 解压到空目录，再运行 `--self-check` 和整目录审计，并逐文件比较。

**完成标准**：每份 Markdown 均通过同一隔离规则和持久化门禁；没有旧版“对话快照替代文件”的内容残留。

## 审计器维护

修改审计器后运行：

```bash
node .agents/skills/speculo-write-canonical/scripts/build-canonical.mjs --self-check
```

自检必须覆盖：合法构建、合法目录审计，以及对额外 URL、项目名称、内部目录、源文件名、frontmatter、manifest、XML 来源标签、缺失 `ai-workspace/`、缺失状态文件、缺失不可写平台交付、路径穿越和未完成占位符的拒绝。

## 权威与更新

源能力始终是业务规则的唯一权威。Canonical 是可移植运行形态，不得反向覆盖源能力。源能力变化时，重新读取静态闭包、更新覆盖清单、检查产物和状态语义、重写成品，再完成单份审计、行为演练和整目录审计。
