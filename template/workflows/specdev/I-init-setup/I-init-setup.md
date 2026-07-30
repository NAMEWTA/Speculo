---
id: specdev/init-setup
type: workflow-entry
workflow: specdev
name: 初始化设置
description: 初始化 SpecDev 的语言、配置、全局状态、追踪约定、领域知识布局、验证命令和并发治理。
keywords: [初始化, 配置, status, tracking, 验证命令]
---

# 初始化设置

首次使用 SpecDev、状态根不存在或治理契约发生变化后运行。此 work 只初始化 SpecDev 的状态与配置，不修改项目业务代码。

## 规范输入

- 工作流总览：`<Path>{roots.workflows}/specdev/INDEX.md</Path>`
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
- 是否允许并行 worktree；
- 共享高冲突路径的类型，例如根依赖清单、锁文件、全局导出、共享 schema、迁移索引和全局路由；
- 项目中已有的提交、分支和发布约定。

### 3. 询问不可发现偏好

仅在上下文未提供时询问：

- 交互语言与持久化工件语言；
- 是否允许自动提交；
- 最大并发数；
- Deep Ticket 的迁移、发布和不可逆操作是否必须人工批准；
- 外部任务系统标签是否需要映射。

不询问可由仓库事实回答的文件位置、脚本名或默认分支。

### 4. 写入配置

以 `<Path>{roots.workflows}/specdev/I-init-setup/config-template.json</Path>` 为模板写入 `<Path>{roots.state}/specdev/config.json</Path>`。

要求：

- 字段满足 `<Path>{roots.workflows}/specdev/common/schemas/config.schema.json</Path>`；
- 验证命令来自仓库事实或显式用户决定；
- 未确认命令写 `null`，不得虚构；
- 不写入令牌、凭据、Cookie、个人隐私或敏感环境变量值；
- 自动提交默认关闭，除非用户明确授权。

### 5. 初始化目录与状态

创建或确认以下目录和文件：

- 以 `<Path>{roots.workflows}/specdev/I-init-setup/status-template.json</Path>` 生成 `<Path>{roots.state}/specdev/status.json</Path>`
- `<Path>{roots.state}/specdev/.config/</Path>`
- `<Path>{roots.state}/specdev/changes/</Path>`
- `<Path>{roots.state}/specdev/adr/</Path>`
- `<Path>{roots.state}/specdev/context/</Path>`
- `<Path>{roots.state}/specdev/research/</Path>`
- `<Path>{roots.state}/specdev/archive/</Path>`

从模板生成：

- `<Path>{roots.workflows}/specdev/I-init-setup/tracking-template.md</Path>` → `<Path>{roots.state}/specdev/.config/tracking.md</Path>`
- `<Path>{roots.workflows}/specdev/I-init-setup/domain-layout-template.md</Path>` → `<Path>{roots.state}/specdev/.config/domain-layout.md</Path>`
- `<Path>{roots.workflows}/specdev/I-init-setup/status-labels-template.md</Path>` → `<Path>{roots.state}/specdev/.config/status-labels.md</Path>`

已有永久知识不得被初始化过程清空。已有配置应先验证和展示差异，再按用户授权更新。

### 6. 验证初始化结果

1. 解析 `<Path>{roots.state}/specdev/config.json</Path>` 和 `<Path>{roots.state}/specdev/status.json</Path>`；
2. 对照 `<Path>{roots.workflows}/specdev/common/schemas/config.schema.json</Path>` 与 `<Path>{roots.workflows}/specdev/common/schemas/status.schema.json</Path>`；
3. 确认 `<Path>{roots.workflows}/specdev/I-init-setup/change-status-template.json</Path>` 的字段与 `<Path>{roots.workflows}/specdev/common/schemas/change-status.schema.json</Path>` 对齐；实际创建 change 时替换模板占位符后再执行 Schema 验证；
4. 确认所有必需目录存在；
5. 确认三个配置文档均已从对应模板生成；
6. 运行：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --self-check
```

### 7. 更新状态并汇报

在 `<Path>{roots.state}/specdev/status.json</Path>` 中记录本 work 的开始、完成时间和结果。向用户汇报：状态根、语言、验证命令、并发策略、人工批准策略和任何仍为 `null` 的配置项。

## 完成标准

- `<Path>{roots.state}/specdev/config.json</Path>` 与 `<Path>{roots.state}/specdev/status.json</Path>` 可解析且满足 Schema；
- 状态目录、永久知识目录和归档目录齐全；
- 三个配置文档已就位；
- 验证命令与并发规则有来源；
- 无敏感值被写入；
- 包级自检无 error；
- `<Path>{roots.state}/specdev/status.json</Path>` 已记录本 work 完成。

## 子文件引用

- `<Path>{roots.workflows}/specdev/I-init-setup/config-template.json</Path>`
- `<Path>{roots.workflows}/specdev/I-init-setup/status-template.json</Path>`
- `<Path>{roots.workflows}/specdev/I-init-setup/change-status-template.json</Path>`
- `<Path>{roots.workflows}/specdev/I-init-setup/tracking-template.md</Path>`
- `<Path>{roots.workflows}/specdev/I-init-setup/domain-layout-template.md</Path>`
- `<Path>{roots.workflows}/specdev/I-init-setup/status-labels-template.md</Path>`
