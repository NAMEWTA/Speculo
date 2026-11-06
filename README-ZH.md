# Speculo

为现有 AI 助手提供可复用的工作流、专项技能和持久化项目知识。

Speculo 帮助 AI 从需求推进到真实交付。领域入口按任务引导到具体 Work，Work 保留该类任务有用的专业方法，必要资料和工具按需读取。模型自行选择实施路径，重要决定与结果可以跨会话接续。

[English](README.md) · [快速开始](docs/getting-started.md) · [能力总览](docs/capabilities.md) · [流程与持久化](docs/workflow.md) · [CLI](docs/cli.md)

## 开始使用

需要 Node.js `>=22.22.3 <25`。

```bash
npm install -g @namewta/speculo
speculo init . --workflows specdev --skill-targets agents --skills domain/specdev
speculo doctor .
```

然后对 AI 说：

> 使用 SpecDev，根据这些 issues 做下一次发版。先澄清产品取舍，交互不明确时给我看 UI 原型，确定后继续实现、验证并提交 PR。

安装领域时会一并安装它的 Work 和参考资料。宿主只暴露领域入口即可按需找到它们；经常使用的 Work 也能直接暴露：

```bash
speculo init . --workflows specdev --skill-targets agents --skills domain/specdev,specdev/prototype,specdev/implement
```

Claude 技能目录使用 `--skill-targets claude`，两个宿主同时使用时指定 `agents,claude`。`--skills all` 才明确暴露全部已安装入口。也可以运行 `speculo init` 交互选择。模型、实际工具和权限来自当前宿主。

试用源码分支时，先运行 `pnpm install --frozen-lockfile`、`pnpm build`，再用 `node dist/src/cli.js` 替代 `speculo`。源码版本不代表已发布到 npm。

## 四个领域，39 项可独立使用的 Work

| 领域 | 保留并重写的能力 |
| --- | --- |
| [SpecDev](docs/workflows/specdev.md) · 21 项 | 需求收集、评估追问、调研、原型、规格、目标规划、切片、实施、诊断、代码与架构审查、交付、复盘、学习与提纯归档，以及环境初始化、连接、盘点、主机管理和部署 |
| [Learning](docs/workflows/learning.md) · 9 项 | 学习背景、评估与课程规划、目标学习、完整授课、问答探究、练习、复习、主题提纯和归档 |
| [Media](docs/workflows/media.md) · 7 项 | 创作准备、需求简报、参考拆解、手绘提示词、视频制作、发布草稿和效果复盘 |
| [Person](docs/workflows/person.md) · 2 项 | 毛泽东调查—实践—矛盾分析方法与钢人化多方论证，保留各自专业方法和来源边界 |

**Work 是可以单独调用的任务能力，不是必须逐个打卡的阶段。** 领域 `SKILL.md` 负责按需路由；Work 的 `SKILL.md` 保留具体方法、分支和交付结果。必要的原文、设计样例、技术参考和执行工具仍然存在，调用时才读取。

v3 删除的是工作流 manifest、固定角色、派单协议、任务 DAG、业务 schema 校验和强制交接表单。规划、切片、审查等能力继续保留，由任务规模决定怎么用。每项旧能力的承接位置见 [重构对应表](docs/refactor-map.md)。

## 持久化保持简单

软件交付通常经过需求收集、评估、必要原型、spec、可选切片、实施审查、发布部署和提纯归档；明确的当前任务可以直接进入对应 Work。

默认资料根为项目里的 `.agents/speculo/.speculo/`：

| 位置 | 保存内容 |
| --- | --- |
| `releases/<name>/README.md` | 一次交付的来源、范围、规格、关键决定、进度、真实结果和下一步 |
| `knowledge/adr/` | 长期有效的重要决定、替代方案与原因 |
| `knowledge/context/` | 代码和配置没有直接表达的业务背景 |
| `knowledge/error/` | 已验证且值得复用的根因、修复与预防 |
| `knowledge/design/` | 当前设计，允许 HTML、组件、stories、tokens、图片和必要说明 |
| `environments/<target>.md` | 部署目标、发布方法、数据影响、健康检查与恢复方式 |
| `archive/<name>/` | 已结束交付的历史记录及采用版本 |

已有项目位置优先，有实际内容才建文件。一份交付记录通常够用，小改动的 issue 或 PR 也可能足够；复杂规格和独立切片按内容拆分。设计在长期位置维护，交付记录引用本次采用的具体版本，不强制复制为 `change/DESIGN.md`。

## 命令与 Skills Hub

八个显式 AI 命令覆盖进度、交接、项目维护、仓库审计、历史整理、上游评估、源码 ZIP 和 Speculo 反馈。它们不是 `speculo <命令>` 终端子命令，调用方式和产物见 [命令指南](docs/commands/README.md)。

[Skills Hub](docs/capabilities.md#skills-hub) 提供 15 个按需安装的完整包，保留 API、系统维护、教学、写作、图像和文档渲染等专项能力。安装器只复制资源，不自动执行其中工具。

## 升级与文件保护

方法安装到 `.agents/speculo/`，宿主入口可选投影到 `.agents/skills/` 和 `.claude/skills/`。刷新保留用户资料和不属于安装器的文件；文件归属、路径校验、暂存、并发漂移检查及中断恢复继续由 CLI 负责。

v3 将 Ops 合并到 SpecDev，同时保留各项 Work 的能力；已有 Ops 入口选择映射到相应新入口。旧业务记录按原始字节保留，不再套用已删除的业务协议。详细边界见 [升级说明](docs/upgrade-v3.md) 和 [事务恢复](docs/transaction-recovery.md)。

[完整文档](docs/README.md) · [架构](docs/architecture.md) · [贡献指南](docs/contributing.md) · [研究依据](docs/research.md) · [变更记录](CHANGELOG.md) · [许可证](LICENSE) · [第三方说明](THIRD-PARTY-NOTICES.md)
