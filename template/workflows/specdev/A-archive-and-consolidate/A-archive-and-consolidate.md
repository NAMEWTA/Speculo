---
id: specdev/archive-and-consolidate
type: workflow-entry
workflow: specdev
name: 归档与沉淀
description: 将已完成变更归档至 archive/，并智能评估、提取持久化知识到 adr/、context/、research/ 知识库——与现有知识逐项比对，执行创建/更新/合并/废弃，确保知识始终最新。
keywords: [归档, 沉淀, 知识持久化, 清理, ADR, 词汇表, 研究]
---

# 归档与沉淀

将 `changes/` 中已完成的变更归档至 `archive/`，同时从变更产物中提取可毕业知识，与现有 `<Path>{roots.state}/specdev/adr/</Path>`、`<Path>{roots.state}/specdev/context/</Path>`、`<Path>{roots.state}/specdev/research/</Path>` 知识库智能比对后合并写入。**不是只增不减**——每次运行均评估现有知识是否需要更新、合并或废弃。

产物写入 `<Path>{roots.state}/specdev/</Path>` 下的 adr/、context/、research/、archive/。默认 dry-run 模式，确认后方执行。

## 流程

### 1. 加载上下文与状态

读取 `<Path>{roots.workflows}/specdev/INDEX.md</Path>` 和 `<Path>{roots.state}/specdev/status.json</Path>`，枚举现有知识库全部内容：adr/ 中所有 `NNNN-slug.md`、context/ 中所有术语定义、research/ 中现有研究及 index.md。

**完成标准**：所有知识库现有内容已索引；status.json 已解析；changes/ 目录已枚举。

### 2. 扫描已完成变更

遍历 `<Path>{roots.state}/specdev/status.json</Path>` 的 `active` 数组，筛选 `result: "completed"` 的 change；同时遍历 `<Path>{roots.state}/specdev/changes/</Path>`，读取每个变更的 `.status.json` 作为补充（`change_status: completed`）。收集每个已完成变更的 ADR.md、CONTEXT.md、LOG.md 及 research/ 子目录产物。

**完成标准**：每个已完成变更的元数据和知识产物已收集；无可读产物的变更已标注原因。

### 3. 知识评估与鉴别

加载 `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/discrimination-guide.md</Path>`。将步骤 2 收集的知识与步骤 1 索引的现有知识逐项比对，标注处置动作：create / update / merge / supersede / retire / skip。冲突项标记 needs-confirmation 并展示双方版本与建议。

**完成标准**：每个提取的知识项已标注处置动作和理由；冲突项已展示双方版本及推荐方案。

### 4. 生成归档计划

加载 `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/archive-rules.md</Path>`。对每个已完成变更执行预检（名称格式、状态可解析、源存在、目标不冲突），生成 `changes/ → archive/YYYY-MM/` 移动计划，批量原子性检查。

**完成标准**：归档计划表已生成，每项标注 ready/blocked 及原因；整批原子性已验证。

### 5. 生成知识沉淀计划

加载 `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/consolidation-rules.md</Path>` 和 `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/knowledge-graduation.md</Path>`。基于步骤 3 鉴别结果，生成 adr/、context/、research/ 的创建/更新/废弃计划。

**完成标准**：三个知识库的写入计划已生成；未毕业知识标注保留在归档变更中的位置；冲突项已标注。

### 6. 生成清理计划

加载 `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/cleanup-rules.md</Path>`。扫描现有知识库，识别陈旧、重复、格式违规内容，生成清理候选表（delete / merge / rewrite / keep / needs-confirmation）。

**完成标准**：清理候选表已生成，每项标注分类、理由和风险等级。

### 7. 呈现报告并等待确认

合并步骤 4-6 为统一报告。明确标注所有破坏性操作（移动、删除、覆写）。逐项展示冲突和待确认条目。**默认不修改任何文件**，等待用户逐项确认后进入执行。

**完成标准**：报告已呈现；所有破坏性操作已标注；等待用户确认。

## 子文件引用

| 文件 | 触发条件 |
|------|----------|
| `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/discrimination-guide.md</Path>` | 进入步骤 3「知识评估与鉴别」时加载——智能比对四步法、六种处置动作判定规则、冲突标注格式 |
| `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/archive-rules.md</Path>` | 进入步骤 4「生成归档计划」时加载——预检清单、批量原子性规则、移动与验证规程 |
| `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/consolidation-rules.md</Path>` | 进入步骤 5「生成知识沉淀计划」时加载——adr/context/research 三库的写入规则、合并策略、保护规则 |
| `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/knowledge-graduation.md</Path>` | 进入步骤 5「生成知识沉淀计划」时加载——三文件模型毕业标准、反毕业条件、知识类型到知识库的映射 |
| `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/cleanup-rules.md</Path>` | 进入步骤 6「生成清理计划」时加载——五种清理分类、反模式扫描规则、保护规则 |

## 依赖关系

- 依赖 `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>` 定义的 ADR/CONTEXT/LOG 三文件格式规范
- 依赖 `<Path>{roots.workflows}/specdev/INDEX.md</Path>` 的持久化约定表
