---
id: agents-md-builder
type: skill
name: AGENTS.md Builder
description: 为任意项目扫描 manifest 目录、判定角色、收集证据并生成极简 AGENTS.md 与 CLAUDE.md 重定向文件，形成完整父子导航树；当用户要求为项目生成/刷新 AGENTS.md、构建模块文档导航树、初始化 AI 代理可读的项目导读文档时使用。
---

# AGENTS.md Builder

## 何时使用

当用户要求为项目生成或维护 `AGENTS.md` 文档时使用。典型触发：

- “为这个项目生成 AGENTS.md”
- “构建项目的模块文档导航树”
- “刷新所有模块的 AGENTS.md”
- “为 src/ 下每个目录生成 AI 可读的导读文档”
- “初始化项目的 agent 文档”

## 设计理念

每个 AGENTS.md 是一个**模块导读**，不是目录卡片。它回答：这个模块是什么、如何工作、从哪里开始读、看完之后去哪里。

每一行必须通过**删除测试**：*“删除这一行会导致 AI 代理犯错吗？”* 如果不会，就删掉。

## 输入

- 项目根路径（默认当前工作目录）
- 可选：目标子目录（只处理该子树）
- 可选：manifest 类型过滤（只处理特定生态，如 `package.json`）
- 可选：AGENTS.md 语言偏好（默认中文）

本 skill 自带全部规范，**不外读仓库 `docs/`**。

## 输出

- 每个 manifest 目录的 `AGENTS.md`（模块导读）
- 每个 manifest 目录的 `CLAUDE.md`（一行重定向至 AGENTS.md）
- 生成清单与变更统计
- 已清理的非法 AGENTS.md 清单（若有）

## 执行步骤

### 步骤 1：确定扫描范围

1. 确认项目根路径。若用户未指定，使用当前工作目录。
2. 若用户指定了目标子目录，仅处理该子树。
3. 若用户指定了 manifest 类型过滤（如“只看 package.json”），仅匹配该类型。

### 步骤 2：发现 manifest 目录

1. 读取 `references/manifest-discovery.md`，确认支持的 manifest 文件列表与忽略目录。
2. 从项目根递归扫描（排除忽略目录），找到所有含 manifest 文件的目录。
3. 一个目录有多个 manifest 时，按优先级选主 manifest。
4. 构建 manifest 目录的父子树：子目录的 manifest 继承最近的祖先 manifest 目录。
5. 标记无 manifest 但已存在 AGENTS.md 的目录（待清理）。

### 步骤 3：清理非法文档

1. 无 manifest 目录下的 AGENTS.md → 列出并删除。
2. 无 manifest 目录下的 CLAUDE.md → 列出并删除。

### 步骤 4：判定角色

1. 读取 `references/role-classification.md`。
2. 按 6 种角色的优先级顺序，为每个 manifest 目录判定唯一角色。
3. 命中即停止，不继续匹配。

### 步骤 5：收集证据

1. 读取 `references/evidence-collection.md`。
2. 对每个 manifest 目录，按角色对应的取证顺序收集：
   - Manifest 文件内容
   - 关键目录结构
   - 关键入口文件
   - 依赖与消费关系
   - 测试入口
3. 遵循证据转写原则：结论必须被文件支撑，禁止虚构。

### 步骤 6：生成 AGENTS.md

1. 读取 `references/content-contract.md` 确认必填章节与禁止项。
2. 读取 `references/writing-style.md` 确认排版、长度与语气。
3. 读取 `references/templates/` 中对应角色的模板作为骨架。
4. 自底向上（子 → 父）生成每个 AGENTS.md：
   - 先写子级 → 父级的 Routing 可引用已确定的子级路径
   - 每个 AGENTS.md 只负责自己所在模块
   - 不重复父级或子级已说明的内容
5. 每个 AGENTS.md 生成后执行删除测试：逐行检查是否冗余。

### 步骤 7：生成 CLAUDE.md

1. 读取 `references/claude-redirect.md`。
2. 对每个已生成 AGENTS.md 的目录，生成 CLAUDE.md。
3. CLAUDE.md 只有一行：`读取同层级的AGENTS.md文档。`

### 步骤 8：报告

1. 列出所有生成/更新的 AGENTS.md 路径。
2. 列出所有生成的 CLAUDE.md 路径。
3. 列出所有清理的非法文档路径。
4. 按角色统计：根 x1、聚合 xN、可运行 xN、能力模块 xN、契约模块 xN。

## 渐进披露

- `references/manifest-discovery.md`：扫描项目确定 manifest 目录列表时读取。
- `references/role-classification.md`：为每个 manifest 目录判定角色时读取。
- `references/evidence-collection.md`：按角色收集证据时读取。
- `references/content-contract.md`：生成 AGENTS.md 必填章节与禁止项时读取。
- `references/claude-redirect.md`：生成 CLAUDE.md 重定向文件时读取。
- `references/writing-style.md`：确认中文排版、长度密度、语气要求时读取。
- `references/templates/repo-root-AGENTS.md`：角色为 `repo-root` 时读取。
- `references/templates/aggregator-AGENTS.md`：角色为 `aggregator` 时读取。
- `references/templates/runnable-app-AGENTS.md`：角色为 `runnable-app` 时读取。
- `references/templates/capability-module-AGENTS.md`：角色为 `capability-module` 时读取。
- `references/templates/contract-module-AGENTS.md`：角色为 `contract-module` 时读取。
- `references/templates/scripts-docs-AGENTS.md`：角色为 `scripts-docs` 时读取。
