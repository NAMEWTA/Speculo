# README 写作指南

README 面向首次接触项目的读者，需要在约 5 秒内回答三个问题：**这是什么、怎么用、值不值得用**。本指南定义 Speculo 项目的通用 README 结构与写作规范，供 `docs-sync` 及其他命令在生成或审计 README 时引用。

> **同步规则参见 [readme-contract.md](./readme-contract.md)。** 本指南定义"写什么内容"（内容规范）；readme-contract.md 定义"何时同步、如何验证"（同步契约）。两者互补。

## 九段式结构

项目简单时合并相邻章节，README 很长时把 API、架构解释和贡献流程移到对应文档。以下九段覆盖从"吸引注意"到"引导参与"的完整认知漏斗。

| # | 段落 | 用途 | 缺失后果 |
|---|------|------|----------|
| 1 | **Header** | 项目名 + 一句话定位 + 徽章栏 + 语言切换 | 读者不知道项目是否活跃、能否跨语言阅读 |
| 2 | **About** | 价值主张 + 内容概览 + 独特卖点 | 读者无法快速判断项目是否解决他的问题 |
| 3 | **Quick Start** | 前置条件 → 安装命令 → 预期输出 | 读者放弃尝试 |
| 4 | **Project Structure** | ASCII 目录树 + 命名规范 | 读者不知道从哪里入手改代码 |
| 5 | **How to Study / Use** | 分步学习或使用方法 | 读者不知道怎么消化内容 |
| 6 | **Tech Stack** | 组件-包名-用途三列表 | 读者不知道需要什么依赖 |
| 7 | **Contributing** | Fork → Branch → Convention → Test → PR | 潜在贡献者不知道流程而放弃 |
| 8 | **License** | 类型 + LICENSE 文件链接 | 读者不确定能否合法使用 |
| 9 | **Footer** | 社区链接 + 跨语言导航 | 读者不知道怎么联系或获取更多信息 |

---

### 1. Header

**应包含：**
- 项目名居中（`<h1 align="center">Project Name</h1>`）
- 一句话 tagline —— 说明输入、输出或解决什么问题，删除空泛营销语
- 徽章栏：License、语言版本、包管理器、Stars、PRs、CI 状态等
- 语言切换链接：`[中文](./README-ZH.md)` ← → `[English](./README.md)`

**不应包含：**
- 超过一行的冗长描述（放到 About 段）
- 失效或状态无价值的徽章

**示例：**

```markdown
<h1 align="center">My Project</h1>
<p align="center"><em>A one-line description of what it does.</em></p>
<p align="center">
  <a href="./README-ZH.md">中文</a>
</p>
<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT">
  <img src="https://img.shields.io/badge/Python-3.10+-green.svg" alt="Python 3.10+">
  <img src="https://img.shields.io/github/stars/owner/repo?style=flat" alt="Stars">
</p>
```

---

### 2. About

**应包含：**
- 一段清晰的价值主张：这个项目解决什么痛点、为谁解决
- 内容/功能概览表（若为学习型仓库：模块列表；若为工具型：核心功能）
- 1-3 个独特卖点（why this project over alternatives）

**不应包含：**
- 实现细节（放到项目结构或文档链接）
- 安装步骤（放到 Quick Start）
- 与其他项目逐行对比（冗长且容易过时）

**示例（学习型仓库）：**

```markdown
## About

My Project 是一套从零到生产就绪的 XYZ 学习路线，每个模块以"带注释的可运行脚本"而非教程形式呈现 — 代码即教材。

| # | 模块 | 覆盖内容 |
|---|------|----------|
| 01 | Getting Started | 环境搭建、Hello World |
| 02 | Core Concepts | 核心抽象与生命周期 |
| ... | ... | ... |
```

---

### 3. Quick Start

**应包含：**
- **前置条件**：运行时版本、系统依赖、必需的 API key 等
- **一步安装命令**：`npx`、`git clone`、`pip install` 等，可复制粘贴
- **预期输出**：读者执行后应该看到什么才算成功
- 预计耗时在 60 秒以内

**不应包含：**
- 长篇背景解释
- 多分支安装路径（初学者只需一条"最快路径"）

**示例：**

```markdown
## Quick Start

**前置条件：** Node.js >= 22、npm >= 10

```bash
npx my-package init
```

预期输出：

```
✔ Project initialized at ./my-project
✔ 3 files created
```
```

---

### 4. Project Structure

**应包含：**
- ASCII 目录树（第一层级，不超过 2 层深度）
- 关键命名规范说明（文件前缀、目录约定等）
- 每个顶级目录的一句话用途

**不应包含：**
- 完整展开的文件树（冗长且随 commit 快速过时）
- 每个文件的详细说明（放到各自模块的文档中）

**示例：**

```markdown
## Project Structure

```
.
├── src/            # 源代码
├── tests/          # 测试（文件名 = test_<module>.py）
├── docs/           # 详细文档
├── scripts/        # 运维/CI 辅助脚本
├── pyproject.toml  # 项目元数据与依赖
└── README.md
```

命名规范：源文件使用 `snake_case.py`，测试文件使用 `test_` 前缀。
```

---

### 5. How to Study / Use

此节因项目类型而异：

**学习型仓库：** 四步学习法
```markdown
## How to Study

1. **选择模块** — 按编号顺序，每模块构建在前一模块之上
2. **阅读注释** — 每个脚本包含详尽的中文注释，解释每行代码的"为什么"
3. **运行脚本** — `python main-<NN>-<topic>.py`，观察输出
4. **动手实验** — 修改参数、打破代码、修复它
```

**工具/库型仓库：**
```markdown
## Usage

```python
from mylib import Thing
t = Thing(config)
result = t.do("input")
```

详见 [docs/](./docs/)。
```

---

### 6. Tech Stack

**格式：** 组件-包名-用途三列表，按层或类别分组。

**应包含：**
- 核心运行时与框架
- 关键依赖（用户需要知道的，不是全部 `node_modules`）

**示例：**

```markdown
## Tech Stack

| 组件 | 包名 | 用途 |
|------|------|------|
| Runtime | Python 3.10+ | 主运行环境 |
| Package Manager | uv | 依赖管理与虚拟环境 |
| LLM Framework | langchain | 大语言模型编排 |
| Vector Store | chromadb | 嵌入式向量存储与检索 |
```

---

### 7. Contributing

**应包含：**
- Fork → Branch → Convention → Test → PR 简洁流程
- Commit 规范（如 Conventional Commits）
- 在哪提 issue、讨论设计

**不应包含：**
- 完整的 CLA 法律文本（链接到 CONTRIBUTING.md）

**示例：**

```markdown
## Contributing

1. Fork 本仓库
2. 从 `main` 分支创建功能分支：`git checkout -b feat/my-feature`
3. 提交遵循 [Conventional Commits](https://www.conventionalcommits.org/)
4. 确保现有测试通过并添加新测试
5. 提交 PR 并描述改动原因

欢迎提 issue 讨论新功能或报告 bug。
```

---

### 8. License

**格式：** 一句话 + LICENSE 文件链接。

```markdown
## License

MIT © [Author] — 详见 [LICENSE](./LICENSE) 文件。
```

---

### 9. Footer

**应包含：**
- 社区/联系链接（GitHub Discussions、Discord、Twitter 等）
- 跨语言 README 跳转链接（与 Header 的徽章栏中的语言切换呼应）

```markdown
---

<p align="center">
  <a href="./README-ZH.md">中文文档</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/owner/repo/discussions">Discussions</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/owner/repo/issues">Report Bug</a>
</p>
```

---

## 双语言原则

遵循 [readme-contract.md](./readme-contract.md) 中的铁律：

- **`README.md` 始终为英文（EN）。** 与之配对的是 `README-ZH.md`，为一对一的中文翻译镜像。
- 两文件顶部互相提供可点击跳转链接。
- 结构完全对称，内容一一对应。标题顺序、命令、代码块、URL、表格字段保持对等；代码实体不翻译。
- `README.md` 内容变更时，`README-ZH.md` 必须在同一次同步中完成对应更新。

---

## 与其他资产的关系

| 资产 | 路径 | 关系 |
|------|------|------|
| readme-contract.md | `./readme-contract.md` | 同步规则与验证契约 —— 定义**何时更新**、触发条件、多语言铁律 |
| document-lifecycle-contract.md | `./document-lifecycle-contract.md` | 文档生命周期 —— 定义**如何决定** add/update/delete/merge |
| docs-sync SKILL.md | `../SKILL.md` | 编排 skill —— 调用本指南与 readme-contract.md 协同完成 README 审计 |
| 项目文档创建与维护规范 | `temp/项目文档创建与维护规范.md` | 背景参考 —— 综合 50+ 来源的文档规范研究（非运行时依赖） |

---

## 验证清单

生成或审计 README 时逐项检查：

- [ ] Header 有项目名、tagline、徽章栏（至少 License + 语言版本）、语言切换链接
- [ ] About 在 3 秒内回答"这个项目是做什么的"
- [ ] Quick Start 可在 60 秒内完成并看到预期输出
- [ ] 安装命令可复制粘贴执行
- [ ] Project Structure 树与实际目录布局一致
- [ ] Tech Stack 表与 `package.json` / `pyproject.toml` 等 manifest 文件中的核心依赖一致
- [ ] Contributing 有可执行步骤
- [ ] License 类型与实际 LICENSE 文件一致
- [ ] Footer 有语言切换和社区链接
- [ ] 无过期命令、路径、参数、徽章、链接
- [ ] `README-ZH.md` 与 `README.md` 同步更新

逐段删除测试：删掉后不影响采用决策或正确使用的内容应压缩、下沉或删除。
