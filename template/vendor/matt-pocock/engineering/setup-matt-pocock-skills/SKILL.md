---
name: setup-matt-pocock-skills
description: "为本仓库配置工程化技能 —— 设置 issue tracker、triage 标签词汇表以及领域文档布局。在首次使用其他工程化技能之前运行一次。"
disable-model-invocation: true
---

# 配置 Matt Pocock 技能

搭建工程化技能所依赖的每仓库配置：

- **Issue tracker** —— issue 的存放位置（默认使用 GitHub；也支持本地 markdown）
- **Triage 标签** —— 五个标准 triage 角色使用的字符串
- **领域文档** —— `CONTEXT.md` 和 ADR 的存放位置，以及读取它们的消费方规则

这是一个提示驱动的技能，不是确定性脚本。先探索，展示发现结果，与用户确认，然后写入。

## 流程

### 1. 探索

查看当前仓库以了解其初始状态。读取已有内容；不要假设：

- `git remote -v` 和 `.git/config` —— 这是 GitHub 仓库吗？是哪一个？
- 仓库根目录下的 `AGENTS.md` 和 `CLAUDE.md` —— 是否存在？其中是否已有 `## Agent skills` 章节？
- 仓库根目录下的 `CONTEXT.md` 和 `CONTEXT-MAP.md`
- `docs/adr/` 和所有 `src/*/docs/adr/` 目录
- `docs/agents/` —— 此技能之前的输出是否已存在？
- `.scratch/` —— 表示本地 markdown issue tracker 约定已在使用中的标志

### 2. 展示发现结果并询问

总结已存在的和缺失的内容。然后**逐项**引导用户完成三项决策 —— 展示一节，获得用户回答，然后进入下一节。不要一次抛出全部三项。

假设用户不了解这些术语的含义。每节以简短解释开头（它是什么、这些技能为什么需要它、选择不同会有什么变化）。然后展示选项和默认值。

**A 节 —— Issue tracker。**

> 解释："Issue tracker" 是本仓库 issue 的存放位置。`to-tickets`、`triage`、`to-spec`、`qa` 等技能会从中读取和写入 —— 它们需要知道是调用 `gh issue create`、在 `.scratch/` 下写入 markdown 文件，还是遵循你描述的其他工作流。请选择你实际跟踪本仓库工作的地方。

默认倾向：这些技能是为 GitHub 设计的。如果 `git remote` 指向 GitHub，则建议使用 GitHub。如果 `git remote` 指向 GitLab（`gitlab.com` 或自托管主机），则建议使用 GitLab。否则（或用户偏好其他方式），提供：

- **GitHub** —— issue 存放在仓库的 GitHub Issues 中（使用 `gh` CLI）
- **GitLab** —— issue 存放在仓库的 GitLab Issues 中（使用 [`glab`](https://gitlab.com/gitlab-org/cli) CLI）
- **本地 markdown** —— issue 以文件形式存放在本仓库的 `.scratch/<feature>/` 下（适合个人项目或无远程仓库的场景）
- **其他**（Jira、Linear 等）—— 请用户用一段话描述工作流；技能将记录为自由文本

仅当用户选择了 **GitHub** 或 **GitLab** 时，才追问一个问题：

> 解释：开源仓库经常以 Pull Request 形式收到功能请求，而不仅仅是 issue —— PR 是附带代码的 issue。如果开启此选项，`/triage` 会将*外部* PR 拉入同一队列，并对其应用与 issue 相同的标签和状态（协作者进行中的 PR 不受影响）。如果 PR 不是你接收请求的渠道，请关闭此选项。

- **PR 作为请求渠道** —— 是 / 否（默认：否）。将答案记录到 `docs/agents/issue-tracker.md`。对于本地 markdown 和其他 tracker，跳过此问题 —— 没有 PR。

**B 节 —— Triage 标签词汇表。**

> 解释：当 `triage` 技能处理一个收到的 issue 时，它会将其移过一个状态机 —— 需要评估、等待报告者回复、可供 AFK agent 领取、可供人工处理、或不予处理。为此，它需要应用与你在 issue tracker 中*实际配置*的字符串相匹配的标签。如果你的仓库已使用不同的标签名称（例如 `bug:triage` 而不是 `needs-triage`），请在此处映射，以便技能应用正确的标签，而不是创建重复标签。

五个标准角色：

- `needs-triage` —— 维护者需要评估
- `needs-info` —— 等待报告者回复
- `ready-for-agent` —— 已完全明确，AFK 可用（agent 无需人工上下文即可领取）
- `ready-for-human` —— 需要人工实现
- `wontfix` —— 不予处理

默认值：每个角色的字符串等于其名称。询问用户是否需要覆盖。如果他们的 issue tracker 没有现有标签，默认值即可。

**C 节 —— 领域文档。**

> 解释：一些技能（`improve-codebase-architecture`、`diagnosing-bugs`、`tdd`）会读取 `CONTEXT.md` 文件以了解项目的领域语言，以及 `docs/adr/` 以了解过去的架构决策。它们需要知道仓库是有一个全局上下文还是有多个（例如 mono repo 中前端/后端各有独立上下文），以便在正确的位置查找。

确认布局：

- **单上下文** —— 仓库根目录下一个 `CONTEXT.md` + `docs/adr/`。大多数仓库属于此类。
- **多上下文** —— 根目录下 `CONTEXT-MAP.md` 指向各上下文的 `CONTEXT.md` 文件（通常为 mono repo）。

### 3. 确认并编辑

向用户展示以下内容的草稿：

- 要添加到 `CLAUDE.md` / `AGENTS.md`（根据第 4 步的选择规则决定编辑哪个文件）的 `## Agent skills` 块
- `docs/agents/issue-tracker.md`、`docs/agents/triage-labels.md`、`docs/agents/domain.md` 的内容

让他们在写入之前编辑。

### 4. 写入

**选择要编辑的文件：**

- 如果 `CLAUDE.md` 存在，编辑它。
- 否则如果 `AGENTS.md` 存在，编辑它。
- 如果两者都不存在，询问用户要创建哪一个 —— 不要替他们选择。

当 `CLAUDE.md` 已存在时绝不创建 `AGENTS.md`（反之亦然）—— 始终编辑已存在的那个。

如果所选文件中已有 `## Agent skills` 块，原地更新其内容，而不是追加重复块。不要覆盖用户对周围章节的编辑。

该块的内容：

```markdown
## Agent skills

### Issue tracker

[关于 issue 跟踪位置的一句话总结，以及外部 PR 是否作为 triage 渠道]。参见 `docs/agents/issue-tracker.md`。

### Triage labels

[关于标签词汇表的一句话总结]。参见 `docs/agents/triage-labels.md`。

### Domain docs

[关于布局的一句话总结 —— "单上下文"或"多上下文"]。参见 `docs/agents/domain.md`。
```

然后使用此技能文件夹中的种子模板作为起点，写入三个文档文件：

- [issue-tracker-github.md](./issue-tracker-github.md) —— GitHub issue tracker
- [issue-tracker-gitlab.md](./issue-tracker-gitlab.md) —— GitLab issue tracker
- [issue-tracker-local.md](./issue-tracker-local.md) —— 本地 markdown issue tracker
- [triage-labels.md](./triage-labels.md) —— 标签映射
- [domain.md](./domain.md) —— 领域文档消费方规则 + 布局

对于"其他"issue tracker，根据用户的描述从头编写 `docs/agents/issue-tracker.md`。

### 5. 完成

告诉用户配置已完成，以及哪些工程化技能现在将读取这些文件。提醒他们之后可以直接编辑 `docs/agents/*.md` —— 只有在需要切换 issue tracker 或从头重新配置时才需要重新运行此技能。
