# Speculo

为现有 AI 助手提供简洁技能与可持续使用的项目知识。

Speculo 把软件需求到上线串成一个可恢复的工作过程。模型自行判断实现路径，文档只保存后续确实需要的事实、决定和结果。

[English](README.md) · [快速开始](docs/getting-started.md) · [流程与持久化](docs/workflow.md) · [CLI](docs/cli.md) · [升级到 v3](docs/upgrade-v3.md)

## 开始使用

需要 Node.js `>=22.22.3 <25`。

```bash
npm install -g @namewta/speculo
speculo init . --workflows specdev --skill-targets agents --skills domain/specdev
speculo doctor .
```

然后对 AI 说：

> 使用 SpecDev，根据这些 issues 做下一次发版。先澄清产品问题，需要时给我看 UI 原型，确定后继续实现并验证。

试用当前源码分支时，运行 `pnpm install --frozen-lockfile`、`pnpm build`，再用 `node dist/src/cli.js` 替代 `speculo`。分支中的版本号不代表该版本已发布到 npm。

使用 Claude 技能目录时指定 `--skill-targets claude`，两个宿主同时使用时指定 `agents,claude`。也可以直接运行 `speculo init` 交互选择。Speculo 提供方法，实际模型、工具和执行权限来自当前宿主。

## 四个技能

| 技能 | 用途 |
| --- | --- |
| [specdev](template/workflows/specdev/SKILL.md) | 需求、必要的 UI 设计、spec、实施、审查、部署与知识提纯 |
| [learning](template/workflows/learning/SKILL.md) | 完整授课、问答、探索、练习与学习笔记 |
| [media](template/workflows/media/SKILL.md) | 创作需求、参考分析、图像/媒体制作与真实产物检查 |
| [person](template/workflows/person/SKILL.md) | 多面分析、问题诊断、策略与行动选择 |

每个领域只有一份 `SKILL.md`。按任务需要进入，不要求从第一步走起。小修复可直接实施；复杂任务才拆分可独立验证的工作。SpecDev 已包含 Ops 的部署职责。

## 持久化保持简单

默认数据根为项目里的 `.agents/speculo/.speculo/`。已有文档、组件、配置可以继续作为权威来源。

| 位置 | 保存内容 |
| --- | --- |
| `releases/<name>/README.md` | 一次发版的来源、范围、spec、进度、验证结果和下一步 |
| `knowledge/adr/` | 长期影响项目的重要决定及原因 |
| `knowledge/context/` | 代码无法直接表达的当前事实 |
| `knowledge/error/` | 已查明且值得复用的故障经验 |
| `knowledge/design/` | 当前有效设计，可包含 HTML、组件、stories、图片等 |
| `environments/<target>.md` | 已知部署目标、发布方法、数据影响、健康检查与恢复方法 |
| `archive/<name>/` | 已结束发版的历史记录 |

目录按需创建，一份发版记录通常就足够。原始需求用来源链接保留，spec 串联已确认内容，切片只是必要时的小清单。恢复工作优先更新原记录；不默认产生 TASK/REPORT、tickets-map、goal-plan 或 JSON 状态文件。

设计放在长期位置，由发版记录引用具体版本；无需复制一份 `change/DESIGN.md`。实现要检查同页面、同状态的真实结构，不能把测试通过当作视觉一致。只有用户明确要求最终人工验收时才保留该待办，技术验证不能替代用户决定。

## 其他入口

保留八个显式 AI 命令：`status`、`handoff`、`project-maintenance`、`git-repository-audit`、`git-history-squash`、`upstream-assess`、`source-code-zip`、`speculo-feedback`。这些是对 AI 的请求，不是 `speculo <命令>` 终端子命令。

Skills Hub 提供按需安装的独立工具技能。流程内不再设置 Herdr/Orca 适配、执行模式选择或固定角色。需要额外工具时，按当前宿主能力和用户要求使用。

## 文件保护仍然保留

方法安装到 `.agents/speculo/`，可选技能入口投影到 `.agents/skills/` 和 `.claude/skills/`。刷新会更新受管方法，保留用户数据和不属于安装器的文件。

CLI 保留文件所有权、路径校验、暂存、原子替换、并发漂移检测及恢复记录；它不解释发版状态、不验证 AI 的设计判断。用户数据不需要符合 Speculo 的业务 schema。

[架构](docs/architecture.md) · [贡献指南](docs/contributing.md) · [重构依据](docs/research.md) · [变更记录](CHANGELOG.md) · [许可证](LICENSE)
