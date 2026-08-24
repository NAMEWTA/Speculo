---
name: speculo-write-work
description: 设计、创建或重构 Speculo workflow 中的单个 Letter-name work 入口及其分支子文件；当任务涉及 work 职责、change 产物、状态更新、完成标准或 Path 指针时使用。
---

# Speculo Write Work

以**流程步骤**为主导词。一个 work 将一个明确的 workflow 阶段从已知输入推进到可验证产物与下一路由。

## 过程

### 1. 读取 workflow 上下文

读取 [项目模型](../_shared/project-model.md)、[路径规则](../_shared/path-and-reference-rules.md)、[质量模型](../_shared/authoring-quality.md)、[Work contract](references/work-contract.md)、目标 workflow 的 `INDEX.md`、根 README 激活合同（存在时）、`common/rules`、相关 schema/tools、`_state` 种子、相邻 works 和真实调用方。用户提供参考内容时，先应用质量模型中的“参考内容复用”规则，再继续设计。

**完成标准**：目标 workflow 的 state schema、change 生命周期、输入权威、输出 owner、路由和副作用边界已逐项列出；没有套用其他 workflow 的固定字段。

### 2. 定义职责与主导词

说明该 work 接收什么状态、作出哪一类决定、产生什么权威工件，以及下一步由谁负责。检查同 workflow 下是否已有相同主导词或相同产物 owner。

**完成标准**：职责可用一句话表达；所有输入和输出只有一个 owner；与现有 work 无重复阶段或冲突写入。

### 3. 设计步骤与披露

按真实依赖排序步骤：恢复上下文、探索/判断、生成工件、验证、更新状态、返回路由。每个步骤就近引用所需 rule/template/schema/tool。只有特定分支需要的协议或模板下沉到子文件。

**完成标准**：每条运行分支可从入口到达；每一步的输入在此前已产生；每步有可检查完成标准；关键覆盖要求穷尽。

### 4. 实施入口与子文件

创建 `template/workflows/<workflow>/<Letter>-<name>/<Letter>-<name>.md`。使用当前 work frontmatter 形态、`<Path>` alias 和 `{roots.state}/<workflow>/changes/{change}/` 运行时产物路径。更新所需 schema、template 或 tool，但不修改 INDEX 的自动区块。

**完成标准**：目录与入口同名；id、workflow 和 name 一致；静态 `<Path>` 全部存在；动态 state 路径符合 namespace 所有权；所有子文件都有触发位置。

### 5. 验证 change 生命周期

演练新建/恢复 change、输入缺失、验证失败和成功路由。检查 workflow `status.json` 与 change `.status.json` 的更新顺序，以及目标 workflow 当前 schema 对 `current_work`、`works_run` 和结果状态的所有权语义。

**完成标准**：失败不会推进 Ready/完成状态；恢复不会重复询问已确认事实；成功返回产物完整路径、验证证据和下一 work。

### 6. 交回 workflow 包维护者

执行 [Validation gates](../_shared/validation-gates.md)。需要新增、删除或重命名 work 时，调用 `speculo-write-workflows` 重建 AUTO-INDEX 和做包级校验。

**完成标准**：条目级验证通过；包级待办、索引变更和兼容性删除已明确交付，不留下手工生成区块。
