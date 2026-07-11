# 编写 Agent 简报

Agent 简报是一段结构化的评论，在 issue 或 PR 进入 `ready-for-agent` 状态时发布到 GitHub issue 或 PR 上。它是离线 Agent 将依据的权威规范。原始正文和讨论是上下文 — Agent 简报是契约。

简报陈述了 **Agent 应该做什么**，这延伸到两种处理面：对于 issue，是从零开始构建变更；对于 PR，是对*现有 diff* 的剩余工作 — 完成它、填补缺口、处理审查意见。无论哪种处理面，原则相同；下面的 PR 示例展示了差异。

## 原则

### 持久性优先于精确性

Issue 可能在 `ready-for-agent` 状态下停留数天或数周。代码库在此期间会发生变化。编写简报时要确保即使在文件被重命名、移动或重构后仍然有用。

- **要**描述接口、类型和行为契约
- **要**命名 Agent 应该查找或修改的特定类型、函数签名或配置形态
- **不要**引用文件路径 — 它们会过时
- **不要**引用行号
- **不要**假设当前实现结构将保持不变

### 行为性，而非过程性

描述系统**应该做什么**，而非**如何**实现。Agent 将重新探索代码库并做出自己的实现决策。

- **好的：** "`SkillConfig` 类型应该接受一个可选的 `schedule` 字段，类型为 `CronExpression`"
- **坏的：** "打开 src/types/skill.ts 并在第 42 行添加一个 schedule 字段"
- **好的：** "当用户不带参数运行 `/triage` 时，他们应该看到一个需要关注的 issue 摘要"
- **坏的：** "在主处理函数中添加一个 switch 语句"

### 完整的验收标准

Agent 需要知道何时完成。每个 Agent 简报必须有具体的、可测试的验收标准。每个标准应可独立验证。

- **好的：** "运行 `gh issue list --label needs-triage` 返回已经过初始分类的 issue"
- **坏的：** "分类应该正常工作"

### 明确的范围边界

说明哪些内容不在范围内。这可以防止 Agent 画蛇添足或对相邻功能做出假设。

## 模板

```markdown
## Agent Brief

**Category:** bug / enhancement
**Summary:** 需要完成的事项的一句话描述

**Current behavior:**
描述当前发生的情况。对于 bug，这是有问题的行为。
对于增强，这是该功能建立在其上的现状。

**Desired behavior:**
描述 Agent 工作完成后应该发生的情况。
具体说明边界情况和错误条件。

**Key interfaces:**
- `TypeName` — 需要改变什么以及为什么
- `functionName()` 返回类型 — 当前返回什么以及应该返回什么
- 配置形态 — 任何需要的新配置选项

**Acceptance criteria:**
- [ ] 具体的、可测试的标准 1
- [ ] 具体的、可测试的标准 2
- [ ] 具体的、可测试的标准 3

**Out of scope:**
- 不应在此 issue 中改变或处理的事项
- 看似相关但独立的相邻功能
```

## 示例

### 好的 Agent 简报（bug）

```markdown
## Agent Brief

**Category:** bug
**Summary:** Skill 描述截断在单词中间断开，产生破碎的输出

**Current behavior:**
当 skill 描述超过 1024 个字符时，它被精确地在 1024 个字符处截断，
不考虑单词边界。这会产生在单词中间断开的描述
（例如"confi"）。

**Desired behavior:**
截断应在 1024 个字符之前的最后一个单词边界处断行，
并追加"..."以指示截断。

**Key interfaces:**
- `SkillMetadata` 类型的 `description` 字段 — 不需要类型变更，
  但填充它的验证/处理逻辑需要尊重单词边界
- 任何读取 SKILL.md 前置元数据并提取描述的函数

**Acceptance criteria:**
- [ ] 低于 1024 个字符的描述保持不变
- [ ] 超过 1024 个字符的描述在 1024 个字符之前的
      最后一个单词边界处截断
- [ ] 被截断的描述以"..."结束
- [ ] 包括"..."的总长度不超过 1024 个字符

**Out of scope:**
- 更改 1024 个字符的限制本身
- 多行描述支持
```

### 好的 Agent 简报（增强）

```markdown
## Agent Brief

**Category:** enhancement
**Summary:** 添加 `.out-of-scope/` 目录支持以跟踪被拒绝的功能请求

**Current behavior:**
当功能请求被拒绝时，issue 以 `wontfix` 标签和一条评论关闭。
没有对决策或理由的持久记录。
未来类似的请求需要维护者回忆或搜索之前的讨论。

**Desired behavior:**
被拒绝的功能请求应记录在 `.out-of-scope/<concept>.md`
文件中，捕获决策、理由以及所有请求该功能的 issue 链接。
在分类新 issue 时，应检查这些文件以查找匹配项。

**Key interfaces:**
- `.out-of-scope/` 中的 Markdown 文件格式 — 每个文件应有
  一个 `# Concept Name` 标题、一个 `**Decision:**` 行、一个 `**Reason:**` 行
  以及一个包含 issue 链接的 `**Prior requests:**` 列表
- 分类工作流应尽早读取所有 `.out-of-scope/*.md` 文件
  并通过概念相似性将新 issue 与它们匹配

**Acceptance criteria:**
- [ ] 以 wontfix 关闭功能请求会创建/更新 `.out-of-scope/` 中的文件
- [ ] 文件包含决策、理由以及指向已关闭 issue 的链接
- [ ] 如果匹配的 `.out-of-scope/` 文件已存在，新 issue 被追加到
      其"Prior requests"列表中，而非创建重复文件
- [ ] 分类期间，现有 `.out-of-scope/` 文件被检查并在新 issue
      匹配之前的拒绝时被呈现出来

**Out of scope:**
- 自动匹配（人工确认匹配）
- 重新打开之前被拒绝的功能
- Bug 报告（只有增强的拒绝才进入 `.out-of-scope/`）
```

### 好的 Agent 简报（PR）

对于 PR，"Current behavior" 描述 diff 的状态，简报要求 Agent 完成或修复它，而非从零构建。

```markdown
## Agent Brief

**Category:** enhancement
**Summary:** 完成贡献者针对 `triage list` 的 `--json` 输出标志

**Current behavior:**
该 PR 添加了一个 `--json` 标志，将 issue 列表序列化为 JSON。正常
路径工作正常，diff 匹配项目的命令结构。还有两个缺口
未完成：错误仍然以人类文本（非 JSON）打印，且新标志
没有测试覆盖。

**Desired behavior:**
使用 `--json` 时，所有输出 — 包括错误 — 是 stdout 上的格式良好的 JSON，
且命令的退出代码不变。当标志缺失时，现有的人类可读输出
不受影响。

**Key interfaces:**
- 命令的错误路径在 `--json` 下应发出 `{ "error": string }`
  而非纯文本错误
- 复用 PR 中已添加的现有序列化器；不要引入第二个

**Acceptance criteria:**
- [ ] `triage list --json` 对成功和错误情况都发出有效的 JSON
- [ ] 退出代码匹配非 JSON 命令
- [ ] 测试覆盖 `--json` 成功输出和一个错误情况
- [ ] 默认（非 JSON）输出逐字节不变

**Out of scope:**
- 为任何其他命令添加 `--json`
- 更改 PR 中已定义的 JSON 成功负载的形状
```

### 坏的 Agent 简报

```markdown
## Agent Brief

**Summary:** 修复分类 bug

**What to do:**
分类功能坏了。查看主文件并修复它。
大约在第 150 行的函数有问题。

**Files to change:**
- src/triage/handler.ts (第 150 行)
- src/types.ts (第 42 行)
```

这之所以坏，是因为：
- 没有类别
- 模糊的描述（"分类功能坏了"）
- 引用了会过时的文件路径和行号
- 没有验收标准
- 没有范围边界
- 没有当前行为 vs 期望行为的描述
