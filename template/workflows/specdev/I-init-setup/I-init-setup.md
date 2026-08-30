---
id: specdev/init-setup
type: workflow-entry
workflow: specdev
name: 初始化设置
description: 初始化 SpecDev 的语言、配置、全局状态、本地 change 追踪、领域知识布局、验证命令和并发治理。
keywords: [初始化, 配置, status, tracking, 验证命令]
---

# 初始化设置

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/specdev/README.md</Path>`，再执行本入口。

首次使用 SpecDev、状态根不存在或治理契约发生变化后运行。此 work 只初始化 SpecDev 的状态与配置，不修改项目业务代码。

## 规范输入

- 工作流运行合同：`<Path>{roots.workflows}/specdev/README.md</Path>`
- 路径引用契约：`<Path>{roots.workflows}/specdev/common/rules/path-reference-contract.md</Path>`
- 配置模板：`<Path>{roots.workflows}/specdev/I-init-setup/config-template.json</Path>`
- 配置 Schema：`<Path>{roots.workflows}/specdev/common/schemas/config.schema.json</Path>`
- 全局状态模板：`<Path>{roots.workflows}/specdev/I-init-setup/status-template.json</Path>`
- 全局状态 Schema：`<Path>{roots.workflows}/specdev/common/schemas/status.schema.json</Path>`
- Change 状态模板：`<Path>{roots.workflows}/specdev/I-init-setup/change-status-template.json</Path>`
- Change 状态 Schema：`<Path>{roots.workflows}/specdev/common/schemas/change-status.schema.json</Path>`

## 流程

### 1. 解析根目录

确认：

- 工作流根可解析为 `<Path>{roots.workflows}/specdev/</Path>`；
- 状态根可解析为 `<Path>{roots.state}/specdev/</Path>`；
- 当前用户允许在状态根创建目录和工件。

不得把真实绝对路径写回模板或治理文档；持久化引用继续使用根变量。

### 2. 探测项目事实

只读检查仓库根、包管理方式、构建脚本、测试脚本、静态检查、CI、默认分支、项目级 Agent 指令与 worktree 约定。能从仓库发现的事实直接记录，不询问用户。

至少探测：

- 项目测试、类型检查、lint 和构建命令；
- 是否存在多包或多工作区结构；
- 默认父分支、Git worktree 支持和项目已有分支/提交约定；
- 共享高冲突路径的类型，例如根依赖清单、锁文件、全局导出、共享 schema、迁移索引和全局路由；
- 项目中已有的提交、分支和发布约定。

同时确认项目根 `.gitignore` 存在且包含 `specdev-worktree/`（`/specdev-worktree/` 视为等价）。该条目由 `speculo init` 单一维护；缺失时停止并提示用户以当前 Speculo 版本重新运行 `speculo init`，本 Work 不作为第二写入者修改它。

### 3. 询问不可发现偏好

仅在上下文未提供时询问：

- 交互语言与持久化工件语言；
- implementation subagent、集成尝试次数和 UI 设计候选上限（初始化时写入 config，Lead 不计入）；
- Deep Ticket 的迁移、发布和不可逆操作是否必须人工批准；

不询问可由仓库事实回答的文件位置、脚本名或默认分支。

### 4. 写入配置

以 `<Path>{roots.workflows}/specdev/I-init-setup/config-template.json</Path>` 为模板写入 `<Path>{roots.state}/specdev/config.json</Path>`。

要求：

- 字段满足 `<Path>{roots.workflows}/specdev/common/schemas/config.schema.json</Path>`；
- 验证命令来自仓库事实或显式用户决定；
- 未确认命令写 `null`，不得虚构；
- 不写入令牌、凭据、Cookie、个人隐私或敏感环境变量值；
- Ticket 的实现 commit 与本地 candidate integration 仍由具体 Goal Plan/I-implement 取得授权，不存为全局自动副作用开关。

### 5. 初始化目录与状态

创建或确认以下目录和文件：

- 以 `<Path>{roots.workflows}/specdev/I-init-setup/status-template.json</Path>` 生成 `<Path>{roots.state}/specdev/status.json</Path>`
- `<Path>{roots.state}/specdev/.config/</Path>`
- `<Path>{roots.state}/specdev/changes/</Path>`
- `<Path>{roots.state}/specdev/adr/</Path>`
- `<Path>{roots.state}/specdev/context/</Path>`
- `<Path>{roots.state}/specdev/research/</Path>`
- `<Path>{roots.state}/specdev/archive/</Path>`

若全局状态或 config 已存在，先检查各自 `schema_version`。版本未知、JSON 不可解析或状态与当前 workflow 契约不一致时，停止当前 Work；不得在 Work 内迁移、兼容或猜测旧状态。`speculo init` 只会对 `<Path>{roots.workflows}/specdev/runtime-contract.json</Path>` 已登记且存在显式 migrator 的旧版本升级，其他冲突会保留当前安装并报告具体 blocker。只有状态不存在时才从当前 schema 模板创建。

从模板生成：

- `<Path>{roots.workflows}/specdev/I-init-setup/tracking-template.md</Path>` → `<Path>{roots.state}/specdev/.config/tracking.md</Path>`
- `<Path>{roots.workflows}/specdev/I-init-setup/domain-layout-template.md</Path>` → `<Path>{roots.state}/specdev/.config/domain-layout.md</Path>`

已有永久知识不得被初始化过程清空。已有配置应先验证和展示差异，再按用户授权更新。

### 6. 验证初始化结果

1. 解析 `<Path>{roots.state}/specdev/config.json</Path>` 和 `<Path>{roots.state}/specdev/status.json</Path>`；
2. 对照 `<Path>{roots.workflows}/specdev/common/schemas/config.schema.json</Path>` 与 `<Path>{roots.workflows}/specdev/common/schemas/status.schema.json</Path>`；
3. 确认 `<Path>{roots.workflows}/specdev/I-init-setup/change-status-template.json</Path>` 的字段与 `<Path>{roots.workflows}/specdev/common/schemas/change-status.schema.json</Path>` 对齐；实际创建 change 时替换模板占位符后再执行 Schema 验证；
4. 确认所有必需目录存在；
5. 确认两个配置文档均已从对应模板生成；
6. 确认项目根 `.gitignore` 已忽略 `specdev-worktree/`；
7. 运行：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --self-check
```

### 7. 更新状态并汇报

若本 Work 由某个 active change 调用，开始时把该 entry 的 `current_work` 设为 `specdev/init-setup`，完成时将该 id 去重加入 `works_run` 并清空；纯工作流初始化没有 active change 时不创建虚假的 change。时间和验证结果写入本次回复或 change 自有 Evidence/LOG，不写入全局索引。向用户汇报：状态根、语言、验证命令、并发策略、人工批准策略和任何仍为 `null` 的配置项。

## 完成标准

- `<Path>{roots.state}/specdev/config.json</Path>` 与 `<Path>{roots.state}/specdev/status.json</Path>` 可解析且满足 Schema；
- 状态目录、永久知识目录和归档目录齐全；
- 两个配置文档已就位；
- 验证命令与并发规则有来源；
- 项目根 `.gitignore` 已包含 `specdev-worktree/`；
- 无敏感值被写入；
- 包级自检无 error；
- 存在调用 change 时，其 `works_run` 已包含本 work且 `current_work` 已清空；纯初始化时全局 active 保持真实为空。

## 子文件引用

- `<Path>{roots.workflows}/specdev/I-init-setup/config-template.json</Path>`
- `<Path>{roots.workflows}/specdev/I-init-setup/status-template.json</Path>`
- `<Path>{roots.workflows}/specdev/I-init-setup/change-status-template.json</Path>`
- `<Path>{roots.workflows}/specdev/I-init-setup/tracking-template.md</Path>`
- `<Path>{roots.workflows}/specdev/I-init-setup/domain-layout-template.md</Path>`
