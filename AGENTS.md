# AGENTS.md

本文件是给 AI 编码代理使用的仓库工作手册。面向 Codex、Claude、Cursor、Kiro、GPT、Gemini 等代理；不要把它当作 README、营销页或用户 Quick Start。

## 项目身份

- 项目名：`@namewta/speculo`
- 仓库：`https://github.com/NAMEWTA/Speculo`
- 语言与运行时：TypeScript ESM，Node `22.22.3`，pnpm `11.1.3`
- npm bin：`speculo` -> `dist/src/cli.js`
- 发布内容：`package.json#files` 仅包含 `dist/src` 和 `speculo`
- 项目定位：Speculo 是一套 SDD（Specification-Driven Development for AI）框架资产，并提供一个小型 CLI 把资产安装 / 更新到目标项目。

## 仓库布局

```text
Speculo/
├── AGENTS.md                  # AI 代理通用工作手册
├── CLAUDE.md                  # Claude Code 专用工作手册
├── README.md                  # 用户入口文档
├── CHANGELOG.md               # 发布变更记录，release 从这里抽取 notes
├── docs/                      # 框架文档与机器契约
├── scripts/                   # 辅助校验脚本
├── src/                       # CLI TypeScript 源码
├── test/                      # CLI 测试，运行目标是编译后的 dist/test
├── speculo/                   # 包内框架资产源，发布到 npm
│   ├── .speculo/              # 安装到目标项目的状态骨架模板
│   ├── commands/              # 一次性独立命令
│   ├── skills/                # 可复用 skill
│   └── workflows/             # 多阶段 workflow
└── .github/                   # CI、release、dependabot 配置
```

## 开发命令

| 场景 | 命令 |
|------|------|
| 安装依赖 | `pnpm install` |
| 构建 | `pnpm build` |
| 测试 | `pnpm test` |
| 全量检查 | `pnpm check` |
| 校验 bin 入口 | `pnpm verify-bin` |
| 单测某个用例 | `pnpm build && node --test --test-name-pattern="<pattern>" dist/test/cli.test.js` |

测试运行的是编译后的 JS：`pnpm test` 先通过 `pretest` 执行 `pnpm build`，再运行 `node --test dist/test/*.test.js`。

## 两层系统

本仓库同时包含两类内容，修改时必须区分：

| 层 | 路径 | 说明 |
|----|------|------|
| CLI 源码 | `src/`、`test/`、`scripts/verify-bin.mjs` | TypeScript 工具代码，会被构建和测试 |
| 框架资产源 | `speculo/` | Markdown / JSON 资产，CLI 会复制到目标项目；不会被 TypeScript 单测直接覆盖 |

`package.json#files` 决定 npm 包内容。新增需要发布的 CLI 运行时代码或框架资产时，必须确认它落在 `dist/src` 或 `speculo` 内。

## CLI 契约

核心实现位于 `src/index.ts`：

- `INIT_ASSETS = [".speculo", "commands", "skills", "workflows"]`
- `UPDATE_ASSETS = ["commands", "skills", "workflows"]`
- 安装根目录固定为目标项目下的 `speculo/`，禁止把资产散落复制到目标项目根目录。
- `initSpeculo` 会先收集所有冲突路径；只要目标 `speculo/<asset>` 已存在，就整体失败，禁止覆盖。
- `updateSpeculo` 会覆盖 `commands`、`skills`、`workflows`，但必须保留目标项目的 `.speculo/` 用户状态。
- `src/cli.ts` 依赖编译后入口位于 `dist/src/cli.js`，通过 `dirname(import.meta.url)/../..` 定位 package root。修改构建输出布局时必须同步这里和测试。

## 测试约束

- `test/cli.test.ts` 与被发布的资产列表强耦合。
- 新增、删除、重命名 `speculo/` 下会被安装的关键资产时，必须更新测试断言。
- 测试必须继续覆盖以下行为：资产安装在 `<target>/speculo/` 下、`init` 不覆盖冲突、`update` 保留 `.speculo/`、编译后 CLI 能从 package root 找到资产。
- 修改 `src/index.ts`、`src/cli.ts`、`package.json#bin` 或 `package.json#files` 后，至少运行 `pnpm check` 和 `pnpm verify-bin`。

## `.speculo/` 目录区别

禁止混淆这两个目录：

| 路径 | 作用 | 是否发布 |
|------|------|----------|
| `speculo/.speculo/` | 模板骨架，`speculo init` 会复制到目标项目的 `speculo/.speculo/` | 是 |
| 仓库根目录 `.speculo/` | 本仓库 dogfooding Speculo 时产生的工作状态 | 否 |

AI 代理不得把根目录 `.speculo/` 的状态文件当作包内模板修改。需要调整安装模板时，只改 `speculo/.speculo/`。

## 框架资产编辑规则

编辑 `speculo/commands`、`speculo/workflows`、`speculo/skills` 时遵守：

- `docs/persistence-contract.md` 是 `.status.json` schema、目录命名、frontmatter、写入责任的唯一权威。
- 正文中引用 skill、template、workflow、phase 子文档时必须使用相对路径，禁止裸 id 和绝对路径。
- 框架内容与文档主要使用中文；新增内容必须匹配周边语言和风格。
- `speculo/skills/speculo-write/` 是资产创作的元 skill；其 `references/` 内复制了必要契约。编辑该 skill 自身时，必须保持引用和契约一致。
- Template 文件不需要 frontmatter；按 `docs/persistence-contract.md` 的模板说明在顶部写服务 workflow 与产物文件名。

## 发布与 CI

- CI：`.github/workflows/ci.yml` 在 push / PR 到 `main` 时运行 `pnpm build`、`pnpm test`、`node scripts/verify-bin.mjs`。
- 依赖安装：`.github/actions/setup/action.yml` 使用 Node `22.22.3`、pnpm，并执行 `pnpm install --frozen-lockfile`。
- Release：`.github/workflows/release.yml` 只在 `v*` tag 推送时触发。
- 发布前必须保证 tag 版本等于 `package.json#version`。
- Release notes 从 `CHANGELOG.md` 中匹配的 `## [version]` 段落抽取。
- npm 发布使用 `npm publish --provenance --access public`，需要 `NPM_TOKEN`。

## 常见陷阱

- 不要把 README 的版本标签、`package.json#version`、`CHANGELOG.md` 发布段落混为一谈；release 只强制校验 tag 与 `package.json#version`。
- 不要在 `speculo update` 中覆盖 `.speculo/`，这是用户状态目录。
- 不要把框架资产直接复制到目标项目根目录；安装位置固定是 `<target>/speculo/`。
- 不要只改 Markdown 资产而忘记 CLI 测试中对关键文件存在性的断言。
- 不要改 `dist/` 作为源码；构建产物由 `pnpm build` 生成。

## 相关文档

- `README.md`：用户入口与仓库概览
- `CLAUDE.md`：Claude Code 专用约束
- `docs/adopting.md`：接入说明
- `docs/quick-reference.md`：速查
- `docs/Speculo-architecture.md`：架构说明
- `docs/persistence-contract.md`：机器契约
- `docs/workflow-authoring.md`、`docs/skill-authoring.md`、`docs/command-authoring.md`：扩展创作规则
