---
name: speculo-write-skill
description: 设计、创建、迁移、合并或重构 Speculo 的 template/skills 能力；当任务涉及 SKILL.md、调用触发、渐进披露、references/scripts/assets 或 skill 所有权时使用。
---

# Speculo Write Skill

以**可复用能力**为主导词。目标不是把说明装进一个目录，而是让调用方以稳定触发进入同一过程。

## 过程

### 1. 建立当前事实

读取：

- [项目模型](../_shared/project-model.md)
- [路径规则](../_shared/path-and-reference-rules.md)
- [质量模型](../_shared/authoring-quality.md)
- [Skill contract](references/skill-contract.md)
- `../../../template/skills/writing-great-skills/SKILL.md`
- 目标 skill、所有调用它的 command/work/workflow，以及同类 skill

先搜索再判断；不存在的文档不作为契约。用户提供参考内容时，先应用质量模型中的“参考内容复用”规则，再继续设计。

**完成标准**：目标职责、真实调用分支、现有重复能力、所有调用方和所有持久化写入已逐项列出。

### 2. 决定资产边界与调用方式

用 reference 中的决策树判断新增、合并、重命名或删除，并选择 model-invoked 或 user-invoked。Skill 只保留一个可复用职责；一次性 scope/确认/报告编排留在 command，长期状态机留在 workflow。

**完成标准**：一个主导词对应一个职责；每个调用分支只有一个权威 skill；调用方式和 description 的每个触发分支都有真实调用方或用户场景。

### 3. 设计信息层级

将每次运行必需的有序步骤保留在 `SKILL.md`。把分支专属规则放入命名明确的 reference，并在触发步骤就近写明何时读取。把确定性、重复且可验证的动作放入无外部依赖的 script。

**完成标准**：每个分支从入口可达；每个 reference 有触发指针；每个 script 有输入、输出、失败语义和真实调用位置；没有孤立资源。

### 4. 实施最小完整包

创建或更新 `template/skills/<name>/SKILL.md` 及必要资源。Frontmatter、description、目录名和调用方同步更新。Skill 只写调用方提供的目标、自身明确拥有的项目资产，或标准 `{roots.state}/skills/<name>/` namespace，不发明其他 `.speculo` namespace。

**完成标准**：目录内每个文件都被入口或脚本使用；所有旧名称和旧路径的调用方已迁移；删除后无残余引用。

### 5. 验证行为

执行 [Validation gates](../_shared/validation-gates.md)。对 script 运行正常与失败样例；对 model-invoked description 检查每个分支，对 user-invoked skill 确认 `disable-model-invocation: true`。

**完成标准**：所有静态引用可解析；正常与失败场景符合预期；项目校验通过，或阻塞包含命令、退出码、路径和影响。

### 6. 修剪并交付

逐句删除 no-op、重复、沉积和分支泄漏。报告改动文件、调用迁移、验证证据及任何未解决风险。

**完成标准**：同一规则只有一个事实源；入口仅包含每次运行所需内容；二次运行校验无新增 diff。
