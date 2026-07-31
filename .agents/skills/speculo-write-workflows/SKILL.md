---
name: speculo-write-workflows
description: 设计、创建、合并或重构完整 Speculo workflow 包；当任务涉及 INDEX.md、work 集、common、_state 初始化种子、状态 schema、AUTO-INDEX 或 workflow 路由时使用。
---

# Speculo Write Workflows

以**状态机**为主导词。Workflow 将多个 works、权威工件和运行时状态组合成可恢复的长期过程。

## 过程

### 1. 建立包快照

读取 [项目模型](../_shared/project-model.md)、[路径规则](../_shared/path-and-reference-rules.md)、[Workflow contract](references/workflow-contract.md)、[INDEX reference](references/index-template.md)，以及目标 workflow 的全部 INDEX、work 入口、common、schema/tools 和 `_state` 种子。

**完成标准**：每个文件的职责、调用方、静态依赖、runtime owner 和生成关系进入清单；所有现有 works 与状态字段已覆盖。

### 2. 设计生命周期

定义 workflow 的输入、active change 模型、work 路由、完成/阻塞/归档语义和永久 namespace。状态字段由当前业务需要决定并版本化，不复制 SpecDev 或其他 workflow 的 schema。

**完成标准**：每个状态字段有类型、生成者、更新时机和枚举；每个状态转换有 owning work、前置条件和验证证据；无悬空状态。

### 3. 设计 work 图与 common

枚举全部 works 的主导词、输入、输出、owner 和下一路由。重复阶段合并；单 work 专用规则留在该目录；跨 work 平级规则进入 `common/rules`；至少两个 work 独立调用的过程进入 `common/skills`。

**完成标准**：每个权威工件只有一个 owner；每个 work 有独立职责；所有路由可达且没有无出口循环；common 中无单调用方沉积。

### 4. 实施 INDEX、种子与 works

手写 INDEX 的治理部分和状态合同。`_state` 只保存初始化所需种子；运行时路径全部使用 `{roots.state}/<workflow>/`。逐个调用 `speculo-write-work` 实施 work 入口和分支文件。

**完成标准**：INDEX 声明的每个 namespace 有真实种子或明确生成者；每个 work 通过条目级校验；静态文件不包含运行时实例数据。

### 5. 重建 AUTO-INDEX

运行：

```bash
node .agents/skills/speculo-write-workflows/scripts/generate-index.mjs template/workflows/<workflow>
```

脚本只替换唯一标记区块，列表来自当前 work 目录及入口 frontmatter。

**完成标准**：索引包含全部且仅包含 Letter-work；顺序确定；再次运行无 diff；手写部分未变化。

### 6. 包级验证

运行：

```bash
node .agents/skills/speculo-write-workflows/scripts/validate-speculo-assets.mjs . --workflow <workflow>
```

再运行项目自带的 asset validator 和相关测试。演练初始化、恢复、多 active（若支持）、阻塞、成功和归档路由。

**完成标准**：静态引用、状态 schema、AUTO-INDEX、owner 和场景全部一致；失败报告到具体文件和行；无旧 id 或旧 runtime 路径。

### 7. 修剪与交付

执行共享 Validation gates，删除旧兼容分支、重复规则和无调用资源。报告状态 schema 变化和所有调用迁移。

**完成标准**：包可以从 INDEX 恢复；每个动态路径有 owner；每个生成物可重复；解读 workflow 不再依赖被删除的旧技能或文档。
