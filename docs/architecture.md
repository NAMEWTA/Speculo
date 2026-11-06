# 架构与职责

Speculo 由可读方法、按需资源、用户项目记录和文件安装器组成。实际推理、工具和执行权限由现有 AI 宿主提供。

## 方法层

| 内容 | 作用 | 读取时机 |
| --- | --- | --- |
| `template/workflows/<domain>/SKILL.md` | 领域边界与任务路由 | 请求涉及该领域 |
| `template/workflows/<domain>/<work>/SKILL.md` | 具体任务方法与交付结果 | 当前任务需要该能力 |
| Work 的 references / examples / scripts / 素材 | 专门知识、可运行示例、确定性工具与来源 | 对应分支需要时 |
| `template/commands/<name>/COMMAND.md` | 一次明确请求 | 用户调用相应命令 |
| `template/references/memory.md` | 保存、提纯与恢复项目知识 | 需要持久化时 |
| `skills-hub/<category>/<skill>/` | 可独立安装的完整工具技能包 | 安装并调用该技能时 |
| `.agents/skills/speculo-author/` | 本仓库维护方法 | 修改作者内容时；不分发至用户项目 |

领域合并不意味着能力被折叠成几句通用说明。四个领域仍覆盖原 39 项 Work；大资料库通过检索和具体链接访问，不自动进入上下文。详细目录见 [能力总览](capabilities.md)。

## 发现与 ID

`src/assets.ts` 读取标准 frontmatter，并从真实目录发现领域、直接子目录中的 Work，以及命令。无需 workflow manifest、阶段图或业务知识注册文件。

领域 ID 为 `domain/<domain>`。原有 `<domain>-<letter>-<task>` Work 目录按名称得到 `<domain>/<task>`，保留短 ID；新任务可以使用直接的任务目录名。名字与 ID 冲突是安装错误，不靠模型猜测消歧。

命令从 `COMMAND.md` 的 `id` 和 `description` 发现。域/Work 宿主投影指向唯一权威源，引用按源文件目录解释；Hub 安装完整包，保持工具与资料相邻。

## 安装器

| 源文件 | 职责 |
| --- | --- |
| `src/cli-app.ts`、`src/cli.ts` | 参数与终端入口 |
| `src/assets.ts`、`src/workflows.ts` | 领域、Work 与命令发现 |
| `src/hub-catalog.ts`、`src/hub-skills.ts` | Hub 包发现与安装选择 |
| `src/index.ts`、`src/refresh.ts` | staging、方法刷新与用户资料保留 |
| `src/transaction.ts`、`src/external-files.ts` | 事务、漂移检查和故障恢复 |
| `src/agent-files.ts`、`src/agent-skills.ts` | 项目入口与宿主暴露 |
| `src/paths.ts`、`src/doctor.ts` | 项目定位、路径限制与安装诊断 |

领域安装会带入完整 Work 和必要资源；宿主曝光选择独立。保留已有有效选择，旧 Ops 选择映射到合并后的对应方法。首次不强制暴露全部技能，显式 `all` 才选择全部。

安装元数据记录位置、版本、文件归属、投影和可恢复事务。刷新不解析用户发版、学习、创作和环境文件，不要求它们通过业务 schema。路径越界、未知归属、危险节点和并发修改仍会停止受影响操作。

## 工具与验证

工具保留实际机械能力，例如 API 访问、文档渲染、媒体生成、配置修改和文件安装。输入格式的技术正确性、文件安全、返回码和实际产物可以程序化检查。用户是否批准体验、一个人是否理解概念、一个方案是否符合需求，需要按实际任务判断。

构建编译 TypeScript，并为 Hub 生成完整资源镜像以保持 npm 分发中的文件与模式。业务 Work 不再生成 Canonical 或便携状态 validator。

测试覆盖发现、选择、双方宿主投影、更新、移除、用户资料保护和恢复；打包验证使用真实 tarball。修改媒体等真实工具时运行相应产物验证。文字长度或关键字出现次数不认证方法质量。

## 项目记录

用户数据默认在 `.agents/speculo/.speculo/`，现有项目位置优先。当前设计、环境与长期知识持续维护；release 和 archive 记录当时采用的版本和真实结果。代码、配置和测试负责实现事实，笔记补充原因与上下文。

详见 [流程与持久化](workflow.md) 和 [安装事务恢复](transaction-recovery.md)。
