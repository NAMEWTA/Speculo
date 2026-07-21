---
name: research
description: "针对高可信度一手来源调查问题，并将发现结果以 Markdown 文件持久化到变更目录的 research/ 子目录中。适用于需要研究某个主题、收集文档或 API 信息、或委托阅读工作给后台 Agent 的场景。"
---

启动一个**后台 Agent** 来进行研究，这样你可以在它阅读时继续工作。

其工作内容：

1. 针对**一手来源**调查问题 —— 官方文档、源代码、规范、第一方 API —— 而不是基于这些来源的二次编写材料。将每个声明追溯到拥有该声明的来源。
2. 将发现结果写入单个 Markdown 文件，为每个声明标注来源。
3. 将文件持久化到当前变更目录的 `research/` 子目录中，并维护同目录下的 `index.md` 索引。

## 持久化约定

### 产物位置

研究产物写入当前 change 目录下的 `research/` 子目录：

```
<Path>{roots.state}/<workflow>/changes/{change}/research/<research_topic_name>.md</Path>
```

- `<research_topic_name>` 为 kebab-case，如 `react-19-upgrade-guide.md`、`prisma-v6-migration.md`
- `<workflow>` 为当前 workflow 目录名（如 `specdev`）
- `<change>` 为当前活跃变更目录名（格式 `<YYYY-MM-DD>-<topic>`，从 `<Path>{roots.state}/<workflow>/status.json</Path>` 的 `active` 数组中获取）

### 维护 research/index.md

在 `research/` 目录下维护一个索引文件 `<Path>{roots.state}/<workflow>/changes/{change}/research/index.md</Path>`，仅包含一张表格：

| 文件 | 概述 |
|------|------|
| `react-19-upgrade-guide.md` | React 19 升级要点、breaking changes、迁移路径 |
| `prisma-v6-changes.md` | Prisma v6 新增 API、废弃项、性能改进 |

- 表格两列：文件（`research/` 下的相对路径）、概述（一句话概括研究主题和关键发现）
- 每次新增 research 文件后，向表格追加一行
- 每次修改 research 文件后，检查对应概述是否仍准确，必要时更新
- `index.md` 除表格外无需其它内容

### 去重与增量更新

在开始新研究之前：

1. 先读取 `<Path>{roots.state}/<workflow>/changes/{change}/research/index.md</Path>`，检查是否已有同名或高度相关的 research topic
2. 如已存在对应 `.md` 文件，先读取其完整内容
3. 如现有内容已满足当前需求，直接引用，无需重新研究
4. 如现有内容不满足需求（信息过时、覆盖不全、结论有误），在原文件基础上进行增删改：
   - **增**：补充新的发现、新增来源、追加未覆盖的子主题
   - **删**：删除已被证伪的结论、过时的信息
   - **改**：修正错误结论、更新版本号/API 签名
   - 修改后同步更新 `index.md` 中对应行的概述
5. 如需研究的是全新 topic，创建新文件并追加到 `index.md` 表格
