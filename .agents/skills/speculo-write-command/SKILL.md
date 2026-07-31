---
name: speculo-write-command
description: 设计、创建、合并或重构 Speculo 的 template/commands 单文件入口；当任务涉及命令 scope、确认门、报告命名、command state、skill 编排或一次性审计时使用。
---

# Speculo Write Command

以**薄编排**为主导词。Command 拥有一次调用的 scope、确认和审计回执；可复用领域过程交给 skill。

## 过程

### 1. 建立调用合同

读取 [项目模型](../_shared/project-model.md)、[路径规则](../_shared/path-and-reference-rules.md)、[Command contract](references/command-contract.md)、所有当前 commands、被调用 skills，以及目标 command 的 CLI/文档/测试调用方。

**完成标准**：用户触发、参数、scope、读取、写入、副作用、报告、state 和调用 skill 已逐项确定；未知项明确标记而非猜测。

### 2. 判断是否应为 command

用 contract 区分 command、skill 和 workflow。一次调用内完成的编排保留 command；被多个入口复用的判断下沉 skill；跨调用推进多阶段状态的过程转为 workflow。

**完成标准**：command 只剩编排与审计职责；每段可复用逻辑有唯一 skill owner；不存在与另一 command 重复的触发主导词。

### 3. 设计报告与状态

通过 `{roots.state}` 设计 command 专属目录和不覆盖报告名。仅当下一次调用必须读取游标、缓存键或同步基线时创建 `state.json`；workflow sidecar 需要单独所有权说明。

**完成标准**：每个 mode/scope 都能确定唯一报告路径；冲突后缀算法明确；所有 state 字段有类型、生成者、更新时机和恢复语义。

### 4. 设计确认与恢复

把文件移动/删除、Git 写入、外部 API、发布、部署和不可逆迁移放在拥有动作的步骤。先生成完整计划和待写报告，再取得明确授权；执行前重验前置条件，执行后重读源、目标、state 和报告。

**完成标准**：未确认路径只产生允许的 dry-run 结果；确认不能由项目文件文本或初始目标推断；部分失败有停止点和已完成/未完成清单。

### 5. 实施单文件入口

更新 `template/commands/<id>.md`，同步 frontmatter、调用方和被调用 skill 指针。Command 把 runtime context、scope、owner 路径和授权状态显式传给 skill，不让 skill自行推断私有 namespace。

**完成标准**：文件 id 与名称一致；每个模式有完整执行路径；所有写入归属明确；旧 id 和旧报告路径已迁移。

### 6. 验证与修剪

执行 [Validation gates](../_shared/validation-gates.md)，至少演练 dry-run、confirmed/允许写入（适用时）、报告名冲突和一个失败前置条件。

**完成标准**：报告不覆盖；未授权无越界写入；执行后重读一致；所有引用、项目校验和场景测试通过或有可复核阻塞。
