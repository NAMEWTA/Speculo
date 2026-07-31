# Workflow INDEX checklist

此文件提供当前 INDEX 的内容清单。按 workflow 实际复杂度编写，不复制固定 SpecDev 字段。

## Frontmatter

```yaml
---
id: <workflow>
type: workflow
workflow: <workflow>
name: <显示名>
description: <从摄入到长期结果的一句话>
keywords: [<真实触发词>]
---
```

简化、自动生成的 INDEX 可以使用该 workflow 已建立的 `type: workflow-index` 形态；修改前以真实加载器与现有调用为准。不要在同一 workflow 混用两套入口合同。

## 必要内容

### 目标与工件链

说明该 workflow 解决什么问题，以及 works 如何把外部输入推进为权威工件、证据和长期状态。列出冲突裁决规则。

### 运行时根

```markdown
- 工作流根：`<Path>{roots.workflows}/<workflow>/</Path>`
- 状态根：`<Path>{roots.state}/<workflow>/</Path>`
```

### 持久化约定

逐项说明：

- 固定初始化项；
- 首次 work 运行生成项；
- change 内按需产物；
- 经确认提升的长期 namespace；
- command 拥有的 sidecar。

每项都写生成者和时机。没有生成者的路径不列入合同。

### 启动与恢复

说明 roots 解析、配置初始化、change 选择/消歧、work 开始记录、按需加载和完成记录。多个 active change 是否允许由当前 schema 决定。

### 状态字段

对每个 JSON 字段说明类型、必需性、格式/枚举、owner 和更新时机。若 workflow 与 change 各有 status，分别说明。

### 路径与所有权

区分 workflow state、change state、项目路径、长期知识和 command sidecar。说明并发时的 path owner 或 claim 规则（适用时）。

### 副作用边界

列出需要明确授权的动作，以及允许直接执行的只读探索、静态产物生成和验证。

### Work 条目

```markdown
<!-- AUTO-INDEX-START -->

- **X-work** — 名称：description

<!-- AUTO-INDEX-END -->
```

区块由脚本生成，手写部分不包含重复 work 清单。

### Common 与验证

列出 common 的总览入口、规则/schema/tools/skills（实际存在者），以及包级和 change 级验证命令。

## 完成检查

- INDEX 单独可用于恢复 workflow；
- 所有 state 字段和 namespace 有 owner；
- 每个 work 的输入可追溯、输出有消费者；
- 所有 `<Path>` 静态目标存在；
- AUTO-INDEX 二次生成无 diff；
- INDEX 不声明虚构目录或旧兼容字段。
