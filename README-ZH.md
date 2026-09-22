# @namewta/speculo

> 面向模型中立、可恢复 AI 协作工作流的安装与运行时。

Speculo 将 AI 编码工作流打包为可安装资产——commands、skills、workflow packages——通过统一的 CLI 安装到任意项目中。

## 快速开始

```bash
# 在目标项目中初始化 Speculo
npx @namewta/speculo init

# 全局安装
npm install -g @namewta/speculo
speculo init [target]
```

初始化后，目标项目的 `speculo/` 目录包含所有核心资产和选定的 workflow packages。

## 安装

```bash
npm install -g @namewta/speculo
```

要求：Node.js ≥ 22.22.3 且 < 25

## 命令

| 命令 | 说明 |
|---|---|
| `speculo` / `speculo init [target]` | 初始化或刷新 Speculo 1.0。0.x 安装不兼容，必须先由用户移除或改名旧目录。 |
| `speculo version` | 显示本地版本并检查 npm 最新版本。 |
| `speculo doctor [target] [--json]` | 只读检查安装完整性与恢复证据。 |
| `speculo resolve [target] --path <reference>` | 只读解析单个路径，不执行 shell。 |
| `speculo recover [target] --transaction <id>` | 显式恢复已识别的中断刷新事务。 |

旧 CLI 命令与 0.x 迁移路径不恢复。新增只读 `resolve` 与需事务 ID 的显式 `recover`；`doctor --json` 检查安装完整性，不认证真实服务健康。

初始化会原位维护项目 `AGENTS.md` 的被动发现 bootstrap 与全部已安装 workflow 的永久知识引用块，保留非受控内容和换行风格。该块只引用已经提升的知识路径，并明确保持懒激活：不会自动激活 workflow、创建 Change 或执行 Work。缺失的 `CLAUDE.md` 会创建为指向 `AGENTS.md` 的固定重定向；已有手册内容会保留。

## 安装的运行时资产

初始化后，目标项目获得以下可通过 AI agent 调用的资产：

### 7 个 Commands

| Command | 用途 |
|---|---|
| `docs-sync` | 基于固定 Git 区间审计（默认）、修改或显式提交文档与 Agent 手册 |
| `archive-and-consolidate` | 知识生命周期治理：归档过期内容、合并分散知识、清理过时资产 |
| `git-history-squash` | 受控压缩 Git 历史：确认后收敛 first-parent 区间，保留可恢复引用和精确远端 lease |
| `git-repository-audit` | 对一个或多个本地 Git 仓库执行只读、可复现的审计 |
| `handoff` | 持久化精简且可恢复的上下文，供另一 Agent 接手 |
| `retro` | 回顾分析，可创建 `gh issue` |
| `status` | 已安装 workflow、活跃变更与异常摘要 |

### 10 个 Skills

| Skill | 用途 |
|---|---|
| `archive-and-consolidate` | 归档过期内容、合并分散知识、清理过时资产 |
| `docs-sync` | 文档审计，以及 AGENTS.md / CLAUDE.md 手册的增量维护或完整重建 |
| `github-npm-ops` | GitHub issue/PR 分类与 npm 操作 |
| `git-history-squash` | 受控压缩 Git 历史并保留可恢复引用 |
| `optimize-codex-config` | 体检并优化本机 Codex 配置、第三方 Responses 接口、权限和 compaction 故障 |
| `source-code-zip` | 生成无外部依赖、仅含源码的隔离交付 ZIP |
| `speculo-retro` | 回顾分析 |
| `upstream-fork-sync` | 从已证明的集成检查点评估 fork/upstream 增量，并持久化可复现的 diff 与冲突报告 |
| `engineering-standards-builder` | 为当前项目生成 TypeScript/JavaScript/React/Node 工程规范 Skill |
| `writing-great-skills` | Agent Skill 编写参考 |

### 4 个 Workflow Packages

| Workflow | Work 条目 | 说明 |
|---|---:|---|
| **learning** | 9 | 面向项目、产品、学科、语言和技能的完整 30–40 分钟通俗课程、苏格拉底问答课、目标模式 Goal-Plan 编译（按项目切 ≤15 节的单元，先写齐再按课挖掘）、单文件作业评审、可选延迟复习，以及保留原料和引用的主题综合 |
| **specdev** | 14 | 本地优先的规范驱动开发：归档、代码审查、诊断、设计访谈、实现、初始化、学习、目标编排、原型、架构审查、Spec、Ticket、分诊（intake / reconcile / publish / capture）与寻路 |
| **ops** | 3 | 主机盘点与项目部署：控制端初始化、主机治理、APP/公共服务部署，并核验双边文档 |
| **person** | 2 | 人物方法论与严谨审议 workflow（毛泽东认知操作系统、双向钢人论证） |

每个 workflow 以 `INDEX.md` 作为被动发现入口；SpecDev、Learning、Ops 的自动 Work 列表在其 README 激活合同中，Person 由 INDEX 直接列出 Work，不假定它有 README。Work 条目遵循 `<Letter>-<work_name>/<Letter>-<work_name>.md` 命名，配合渐进式展示子文件，并通过 `workspace.json` 中的 `<Path>{roots.xxx}/...</Path>` 指针解析运行时路径。

SpecDev 的 T-triage 仍是唯一远程边界。**intake** 冻结来源；**reconcile** 在本地完成后关闭原来的源 Issue；**publish** 把每张已完成 Ticket 投影为带分类标签的 GitHub Issue（本地源也计入）；**capture** 把尚未成 Change 的记事项写成仍 open 的 GitHub Issue。GitHub 是投影、计数器和 inbox，不是开发权威。摄入源既要关源 Issue 又要记账票数时，两条模式都跑。capture 不创建 Change。

## 文档

- [AGENTS.md](./AGENTS.md) — AI 代理手册（权威）
- [CHANGELOG.md](./CHANGELOG.md) — 发布历史
- [skills/](./skills/) — Speculo 维护者内部编写工具（编写契约自包含于 `_shared/` 与各 skill 的 `references/`）
- [README.md](./README.md) — English version

## 致敬与开源传承

Speculo 站在先行者的肩膀上——也包括我自己的失败。我们怀着深深的敬意，隆重致谢：

- **[SpecForge](https://github.com/NAMEWTA/specforge)** —— 作者自己的上一代项目。一个 CLI 驱动的 SDD 工具，它的失败教会了我们最重要的一课：AI 时代的工具，CLI 不是入口，文档才是。让人类学命令去管理 AI 的文档，是本末倒置。
- **[Matt Pocock Skills](https://github.com/mattpocock/skills)** —— 定义了 AI 辅助开发工作流的开创性项目，启发了"可打包 agent 技能"这一核心理念。
- **[Khazix Skills](https://github.com/KKKKhazix/khazix-skills)** —— 丰富的实用 agent 技能生态，展现了社区驱动工作流共享的力量。
- **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** —— 轻量级 spec 驱动开发框架，其 changes/ 目录结构与归档机制深刻影响了 Speculo 的持久化契约设计。
- **[Superpowers](https://github.com/obra/superpowers)** —— 完整的 agentic 开发方法论，其技能编排与子代理调度为 workflow 包设计提供了重要参考。

Speculo 融合各家之长——从失败中学会"文档即入口"，从 Matt 继承技能方法论，从 OpenSpec 借鉴工程化管理，从 Superpowers 学习编排思想——形成基于包的 workflow 管理、持久化契约以及状态安全刷新生命周期。我们将传承他们的精神，继续前行。

## 许可证

MIT — 详见 [LICENSE](./LICENSE)

## SpecDev Goal 迁移

统一 P Goal、O 兼容入口、Initiative 多 change 探索和计划型 Ticket 的行为变化见[迁移指南](docs/specdev-goal-migration.md)。不自动改写正在进行的 runtime 状态。

## 安装与兼容边界

非交互首次安装默认仅 core；使用 `speculo init [target] --workflows specdev,learning` 显式选包，或 `--core-only` 仅刷新 core。非交互刷新默认更新已安装的受支持包；未选择更新的已有包及其知识引用保留，不把“不更新”解释为卸载或禁用。

项目根 AGENTS 引用字面 workspace 与生成的只读 catalog；发现不创建 Change、不授予动作。宿主不读取项目 AGENTS 时，需由用户显式提供该入口；没有承诺所有宿主自动发现自定义目录。Skill 使用标准 name/description/metadata，私有 workflow Skill 明确声明 Path 解析依赖。

`speculo resolve [target] --path '<Path>{roots.skills}/docs-sync/SKILL.md</Path>'` 只返回真实路径；不要把原始 Path 标记直接粘进 shell。中断时先运行 `speculo doctor [target] --json`，确认原 owner 停止后才 `speculo recover [target] --transaction <id>`；未知锁或漂移不自动清理。

本轮迁移、review 项目映射与验证边界见 [Agent contracts 升级说明](docs/agent-contracts-upgrade.md)。docs-sync 默认 audit；update 与 commit 需分别来自真实用户请求。新 Ops 控制端默认凭据引用，受限明文导出需新计划显式 opt-in。活跃 Skill 绑定由 Lead 审核后重绑，完成 Evidence 不改写。
