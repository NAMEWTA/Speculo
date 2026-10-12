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

## INDEX 必要内容

### 身份与目标

用一句话说明 workflow 解决什么问题。入口只用于发现，不在这里展开执行协议。

### 永久知识

列出未激活 workflow 时仍可按当前请求读取的只读永久 namespace。说明路径不存在时静默跳过，并且被动读取不初始化或写入状态。

### Work 激活

用户明确选择 work 后，指向：

```markdown
<Path>{roots.workflows}/<workflow>/README.md</Path>
```

指针必须说明此时读取 README 是为了取得启动、恢复、状态、所有权和副作用合同。每个 work 入口也引用同一 README。

## README 激活合同

### Work 条目

完整 `type: workflow` 的根 README 使用标记区块：

```markdown
<!-- AUTO-INDEX-START -->

- **X-work** — 名称：description

<!-- AUTO-INDEX-END -->
```

区块由脚本生成，手写部分不包含重复 work 清单；INDEX 不放 Work 条目或 AUTO-INDEX 标记。

简化 `type: workflow-index` / `auto_generated: true` workflow 仍由生成器拥有整个 INDEX，固定包含 frontmatter、`# <workflow> — Work Index`、禁止手改提示和同一 work 清单，不放 AUTO-INDEX 标记或其他手写合同。

### 目标与工件链

说明 works 如何把外部输入推进为权威工件、证据和长期状态，并列出冲突裁决规则。

### 运行时根

```markdown
- 工作流根：`<Path>{roots.workflows}/<workflow>/</Path>`
- 状态根：`<Path>{roots.state}/<workflow>/</Path>`
```

### 持久化约定

逐项说明固定初始化项、首次 work 运行生成项、change 内按需产物、经确认提升的长期 namespace 和 command sidecar。每项都写生成者和时机；没有生成者的路径不列入合同。

### 启动与恢复

说明 roots 解析、配置初始化、change 选择/消歧、work 开始记录、按需加载和完成记录。多个 active change 是否允许由当前 schema 决定。

### 状态字段

对每个 JSON 字段说明类型、必需性、格式/枚举、owner 和更新时机。若 workflow 与 change 各有 status，分别说明。

### 路径与所有权

区分 workflow state、change state、项目路径、长期知识和 command sidecar。说明并发时的 path owner 或 claim 规则（适用时）。

### 副作用边界

列出需要明确授权的动作，以及允许直接执行的只读探索、静态产物生成和验证。

### Common 与验证

列出 common 的总览入口、规则/schema/tools/skills（实际存在者），以及包级和 change 级验证命令。

## 完成检查

- INDEX 的被动读取只发现 workflow 和相关永久知识，不读取 active state；
- 用户激活 work 后可从根 README 恢复 workflow；
- Work 条目只存在于根 README 的生成区块，INDEX 不包含其副本；
- 每个 work 入口都引用根 README；
- 所有 state 字段和 namespace 有 owner；
- 每个 work 的输入可追溯、输出有消费者；
- 所有 `<Path>` 静态目标存在；
- 选定的 README 标记模式或 INDEX 整文件模式与 frontmatter 一致，二次生成无 diff；
- INDEX 与 README 不声明虚构目录或旧兼容字段，且没有重复运行合同。
