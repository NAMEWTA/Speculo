---
id: specdev/init-setup
type: workflow-entry
workflow: specdev
name: 初始化设置
description: 为 specdev workflow 配置变更追踪、领域文档布局、状态标签和语言偏好。首次使用其他 specdev works 前运行一次。
keywords: [初始化, 配置, 设置, setup]
---

# 初始化设置

为 specdev workflow 搭建本地持久化配置——变更追踪约定、领域文档布局、状态标签映射和交互语言偏好。这是一个提示驱动的入口，先探索，展示发现结果，与用户确认，然后写入。

所有配置产物写入 `<Path>{roots.state}/specdev/</Path>` 下：

- **变更追踪约定** → `<Path>{roots.state}/specdev/.config/tracking.md</Path>` —— 变更以本地 markdown 目录形式管理
- **领域文档布局** → `<Path>{roots.state}/specdev/.config/domain-layout.md</Path>` —— 三文件模型（ADR/LOG/CONTEXT）的读写规则
- **状态标签映射** → `<Path>{roots.state}/specdev/.config/status-labels.md</Path>` —— 五个标准 triage 角色的标签字符串
- **语言与配置** → `<Path>{roots.state}/specdev/config.json</Path>` —— 交互语言、报告语言和持久化设置

首次使用 specdev 的任意 work 之前运行一次。之后可直接编辑 `<Path>{roots.state}/specdev/.config/</Path>` 下的文件进行调整，无需重新运行。

## 流程

### 1. 探索

查看当前仓库以了解 specdev 的初始配置状态。读取已有内容；不要假设：

- `<Path>{roots.state}/specdev/config.json</Path>` —— 全局配置文件是否已存在？若存在，读取其内容
- `<Path>{roots.state}/specdev/.config/tracking.md</Path>` —— 变更追踪约定是否已配置？
- `<Path>{roots.state}/specdev/.config/domain-layout.md</Path>` —— 领域文档布局是否已配置？
- `<Path>{roots.state}/specdev/.config/status-labels.md</Path>` —— 状态标签映射是否已配置？
- `<Path>{roots.state}/specdev/status.json</Path>` —— 当前是否有活跃变更？
- `<Path>{roots.state}/specdev/changes/</Path>` —— 已有哪些变更目录？
- `<Path>{roots.state}/specdev/archive/</Path>` —— 归档了哪些历史变更？

总结已存在的和缺失的内容。

**完成标准**：当前 `<Path>{roots.state}/specdev/</Path>` 和已有配置已摸底，已存在的和缺失的内容已明确。

然后进入配置阶段——**逐项**引导用户完成四项决策：展示一节，获得用户回答，然后进入下一节。不要一次抛出全部四项。每个配置阶段之前，简短解释它是什么、specdev 的 works 为什么需要它、选择不同会有什么变化。

### 2. 变更追踪

specdev 的变更追踪使用**本地 markdown** 作为唯一选项。变更以目录形式存放在 `<Path>{roots.state}/specdev/changes/<YYYY-MM-DD>-<topic>/</Path>` 下，通过 `<Path>{roots.state}/specdev/status.json</Path>` 的 `active` 数组追踪当前活跃变更。

变更追踪是 specdev 记录工作进度的地方。当你运行 `S-spec`、`I-implement`、`G-grill-with-docs` 等 work 时，它们会将产物写入当前变更目录。与 GitHub Issues 或 Jira 不同，本地 markdown 方式让所有工作产物（需求文档、设计决策、实现记录）与代码存放在同一仓库中，无需网络连接，且完全由 git 版本控制。

确认用户理解此约定后，将详细规则写入 `<Path>{roots.state}/specdev/.config/tracking.md</Path>`。

详细约定参见 `<Path>{roots.workflows}/specdev/I-init-setup/tracking-convention.md</Path>`。

**完成标准**：变更追踪约定已确认并写入 `<Path>{roots.state}/specdev/.config/tracking.md</Path>`。

### 3. 领域文档布局

specdev 使用**单上下文**布局。每个变更目录 `<Path>{roots.state}/specdev/changes/{change}/</Path>` 下维护三个文件：

- **CONTEXT.md** —— 项目领域术语与概念
- **ADR.md** —— 架构决策记录（本变更相关的决策）
- **LOG.md** —— 设计决策日志（按时间顺序记录每次设计调整）

部分 specdev work（如 `G-grill-with-docs`、`I-implement`）在探索代码库时会读取 CONTEXT.md 了解项目的领域语言，以及 ADR.md 了解过去的架构决策。单上下文意味着整个 specdev workflow 共享一套术语和决策记录，所有变更目录下的三文件模型均遵循相同约定。

确认用户理解此布局后，将消费方规则写入 `<Path>{roots.state}/specdev/.config/domain-layout.md</Path>`。

详细约定参见 `<Path>{roots.workflows}/specdev/I-init-setup/domain-layout.md</Path>`。

**完成标准**：领域文档布局已确认——三文件（ADR/LOG/CONTEXT）持久化到 `<Path>{roots.state}/specdev/changes/{change}/</Path>`，消费方规则已写入。

### 4. 状态标签

specdev 使用五个标准状态角色来追踪工作项的生命周期：

| 角色 | 默认标签 | 含义 |
|------|---------|------|
| `needs-triage` | `needs-triage` | 需要评估 |
| `needs-info` | `needs-info` | 等待补充信息 |
| `ready-for-agent` | `ready-for-agent` | 可执行（agent 无需额外人工上下文即可领取） |
| `ready-for-human` | `ready-for-human` | 需人工处理 |
| `wontfix` | `wontfix` | 不处理 |

当 `T-tickets`、`W-wayfinder` 等 work 处理工作项时，它们会将工作项移过一个状态机——需要评估、等待补充、可供 agent 领取、需人工处理、或不予处理。状态标签是这些状态在持久化文件中的字符串表示。默认每个角色的标签等于其名称，如果你的项目已有不同命名习惯，可以在此映射。

确认用户是否接受默认标签，或需要覆盖为自定义字符串。将映射写入 `<Path>{roots.state}/specdev/.config/status-labels.md</Path>`。

详细约定参见 `<Path>{roots.workflows}/specdev/I-init-setup/status-labels.md</Path>`。

**完成标准**：状态标签映射已确认并写入 `<Path>{roots.state}/specdev/.config/status-labels.md</Path>`。

### 5. 语言与配置

询问用户两项语言偏好：

- **交互语言** —— specdev 与用户交互时使用的语言。选项：`zh-CN`（简体中文）、`en`（英文）。默认：`zh-CN`。
- **报告语言** —— AI 生成产物（Markdown 文档、issue 正文、报告）的默认语言。默认与交互语言相同。

specdev 使用 `<Path>{roots.state}/specdev/config.json</Path>` 存储全局配置。所有 specdev works 在启动时读取此文件以自动选择交互语言和确认策略，无需每次手动指定。

将配置写入 `<Path>{roots.state}/specdev/config.json</Path>`：

```jsonc
{
  "schema_version": 1,
  "language": "<用户选择的交互语言>",
  "persistence": {
    "root_override": null
  },
  "defaults": {
    "confirm_before_external_write": true,
    "report_language": "<用户选择的报告语言>"
  }
}
```

如果 `<Path>{roots.state}/specdev/config.json</Path>` 已存在，仅更新用户本次修改的字段，保留其他现有值。

**完成标准**：语言偏好和配置已写入 `<Path>{roots.state}/specdev/config.json</Path>`。

---

配置完成后，提醒用户可以直接编辑 `<Path>{roots.state}/specdev/.config/</Path>` 下的文件进行调整。只有在需要从头重新配置时才需重新运行本入口。

## 子文件引用

以下子文件包含各配置阶段的详细约定和消费方规则，仅在对应步骤进入时加载：

| 文件 | 内容 | 触发条件 |
|------|------|---------|
| `<Path>{roots.workflows}/specdev/I-init-setup/tracking-convention.md</Path>` | 本地 markdown 变更追踪的读写约定 | 步骤 2「变更追踪」进入时 |
| `<Path>{roots.workflows}/specdev/I-init-setup/domain-layout.md</Path>` | 单上下文三文件模型的路径解析和消费方规则 | 步骤 3「领域文档布局」进入时 |
| `<Path>{roots.workflows}/specdev/I-init-setup/status-labels.md</Path>` | 五个标准状态角色的标签字符串映射 | 步骤 4「状态标签」进入时 |
