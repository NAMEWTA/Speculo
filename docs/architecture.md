# 架构

Speculo 分成可读方法和文件安装器。AI 使用自己的模型、工具与权限完成任务；CLI 只负责正确地发现、安装、刷新和恢复文件。

## 目录与职责

| 源码 | 职责 |
| --- | --- |
| `src/cli-app.ts`、`src/cli.ts` | 参数、交互与命令入口 |
| `src/assets.ts`、`src/workflows.ts` | 从真实目录和标准 frontmatter 发现方法 |
| `src/hub-catalog.ts`、`src/hub-skills.ts` | 发现与按选择安装完整工具技能包 |
| `src/index.ts`、`src/refresh.ts` | 构造新安装，保留用户数据与文件归属 |
| `src/transaction.ts`、`src/external-files.ts` | 暂存、漂移检查、原子替换和失败恢复 |
| `src/agent-files.ts`、`src/agent-skills.ts` | 项目入口与宿主技能投影 |
| `src/paths.ts`、`src/doctor.ts` | 项目定位、路径限制和安装健康检查 |
| `template/` | 四个单文件工作流、八个命令及简短记忆说明 |
| `skills-hub/` | 专项能力；有实际作用的代码、技术资料与许可证 |
| `.agents/skills/` | 本仓库作者技能，不向用户项目分发 |
| `scripts/`、`test/` | 构建、安装行为、真实 tarball 和文件链接验证 |

工作流仅凭 `workflows/<name>/SKILL.md` 发现，不注册 Work、阶段、依赖图或永久知识 manifest。业务 ID `domain/specdev` 用于安装选择，不是 AI 状态协议。命令从 `commands/<name>/COMMAND.md` 的 `id` 和 `description` 发现。

## 安装边界

受管方法在 `.agents/speculo/`，用户运行数据在其 `.speculo/` 目录。可选宿主投影位于 `.agents/skills/` 和 `.claude/skills/`。Hub 是完整包；领域和命令的投影负责定位权威方法文件。

安装器仍保存 workspace、install、managed、projections、hub-skills 等 JSON。这些只回答安装到了哪里、哪些文件归安装器、如何安全替换和恢复。AI 不填写这些文件。业务记录完全是用户文件，可以是 Markdown、HTML、代码、图片或其他可读取格式。

刷新把业务数据作为不透明文件保留，不解释旧 SpecDev、Ops、Learning 的状态，不因业务 JSON 格式失效而阻塞升级。文件路径越界、危险节点、受管身份不明和并发修改仍会阻塞受影响的安装操作，避免覆盖错误对象。

CLI 不会创建空发版、知识索引、任务状态或环境清单。数据目录只在 AI 确实有内容需要保存时创建。

## 保留的确定性代码

构建编译 TypeScript，并生成完整 Hub 资源镜像，避免 npm 打包时遗漏隐藏文件、空目录或文件模式。该镜像是分发实现，不是 AI 上下文。

验证覆盖标准 Skill 元数据、真实相对链接、CLI 参数、文件所有权、双宿主投影、刷新/移除后的用户数据与失败恢复。不存在把字符串出现、截图数量或 `Result: passed` 解释为业务验收通过的程序。

`doctor` 健康只代表安装可用；它不证明代码实现正确、UI 符合原型或某环境已上线。交付依据在实际测试、产物审查、部署观测和用户明确要求的验收决定中。

## 持久化

当前知识与历史交付分离；具体约定见 [开发流程与持久化](workflow.md)。代码、配置和现有文档是事实来源，知识笔记补充它们不能表达的原因。历史记录引用具体提交或稳定设计版本，当前知识变更不会改写过去的验收。
