---
id: specdev/init-setup
type: workflow-entry
workflow: specdev
name: 初始化设置
description: 初始化 SpecDev 的语言、配置、全局状态、本地 change 追踪、领域知识布局、验证命令和并发治理。
keywords: [初始化, 配置, status, tracking, 验证命令]
---

# 初始化设置

激活后读取 `<Path>{roots.workflows}/specdev/README.md</Path>`、`<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>` 与 `<Path>{roots.workflows}/specdev/common/rules/path-reference-contract.md</Path>`。本 Work 只配置 SpecDev，不修改业务代码或迁移旧状态。

## 定位与探测

创建任何目录前，从 cwd 向上定位并打开 `<Path>{roots.state}/workspace.json</Path>`，验证 `path_base` 与 roots。只写声明的 `<Path>{roots.state}/specdev/</Path>`；不得把状态根默认展开成项目根 `.speculo`，嵌套安装的项目根 `.speculo/specdev` 非法。根目录未解析或未获授权时停止写入；持久化引用使用根变量，不把机器绝对路径写回模板。

只读探测包管理、多工作区、构建/测试/类型/lint/CI、默认父分支、worktree、项目 Agent 指令及分支/提交/发布先例；记录根依赖清单、锁文件、共享 schema、迁移索引、全局导出/路由等高冲突资源。能从仓库发现的事实不重复问用户。

确认项目根 `.gitignore` 已含 `specdev-worktree/` 或 `/specdev-worktree/`；该条目由 `speculo init` 唯一维护，缺失时停止并提示重新运行当前版本 CLI，不由 Work 补写。

## 选择初始化分支

| 当前事实 | 执行 |
|---|---|
| 配置或状态不存在 | 读取 `<Path>{roots.workflows}/specdev/I-init-setup/references/first-setup.md</Path>`，仅在首次创建对应文件时读取 `<Path>{roots.workflows}/specdev/I-init-setup/config-template.json</Path>`、`<Path>{roots.workflows}/specdev/I-init-setup/tracking-template.md</Path>`、`<Path>{roots.workflows}/specdev/I-init-setup/domain-layout-template.md</Path>`；只创建缺失骨架；语言、并发、UI 数量与人工批准偏好仅补问尚未知项 |
| 已有有效配置和状态 | 对照 `<Path>{roots.workflows}/specdev/common/schemas/config.schema.json</Path>`、`<Path>{roots.workflows}/specdev/common/schemas/status.schema.json</Path>` 验证并复用；保留 active、历史、永久知识和用户配置 |
| 用户要求修改既有配置 | 先验证并展示差异，再按授权更新；不存全局自动提交/集成开关 |
| JSON 无效、版本未知或契约冲突 | 保留原文件并报告 blocker；迁移只由 `speculo init` 使用 `<Path>{roots.workflows}/specdev/runtime-contract.json</Path>` 中登记的显式 migrator 完成 |

## 验收与返回

配置/全局状态必须可解析且满足 schema；状态、changes、永久 ADR/context/research、archive 与配置目录齐全，tracking/domain-layout 两份配置文档有效。验证命令必须有仓库或用户来源，未知值保留 `null`，不保存秘密。

创建 change 前，对照 `<Path>{roots.workflows}/specdev/I-init-setup/change-status-template.json</Path>` 与 `<Path>{roots.workflows}/specdev/common/schemas/change-status.schema.json</Path>`，真实创建时替换占位符后校验；纯初始化不创建虚假的 change。

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --self-check
```

回读实际配置、状态、目录和忽略项后返回状态根、语言、验证命令、并发/批准策略、未确认配置与检查结果。若由 active change 调用，按原启动/交接合同登记 `current_work`，成功后去重更新 `works_run` 并清空；纯初始化不改已有 active 索引。时间和验证证据留在回复或调用 change 的 Evidence/LOG，不写进全局索引。
