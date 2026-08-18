# Canonical — 独立能力与可移植持久化规范

项目地址：https://github.com/NAMEWTA/Speculo

Canonical 是可以单独上传到网页 AI 平台的 Markdown 能力文档。每一份文档都必须像一个完整运行单元：不依赖源仓库或第二份能力定义，同时把运行过程产生的状态、分析、决定和交付物写入统一的便携目录，支持暂停、恢复、交接和审计。

## 两个同等重要的目标

### 定义隔离

最终文档只描述能力本身，不暴露生成它的目录、源文件、脚本、内部路由、安装方式或维护者约定。读者只凭当前文档和自己的材料即可开始使用。

### 运行持久化

最终文档不能退化成一次性聊天提示。凡能力会生成产物、等待用户回答、跨轮推进或在中断后继续，都必须定义真实文件输出和恢复依据。

统一持久化根为：

```text
ai-workspace/
```

这是文档自身定义的便携输出命名空间，不是任何源仓库目录。用户可以把它放在自己的项目目录、平台可写工作区、挂载文件区或任意本地保存位置。

## 标准目录结构

```text
ai-workspace/
├── status.json
├── changes/
│   └── YYYY-MM-DD-<topic>/
│       ├── .status.json
│       ├── source.md
│       ├── LOG.md
│       └── <能力拥有的工件>
├── knowledge/
│   ├── decisions/
│   ├── context/
│   └── research/
└── archive/
```

目录职责：

| 路径 | 职责 |
|---|---|
| `ai-workspace/status.json` | 全局 active change 索引和当前阶段，不替代权威工件 |
| `ai-workspace/changes/{change}/.status.json` | 单次 change 的状态、阶段、owned artifacts、阻塞与更新时间 |
| `ai-workspace/changes/{change}/source.md` | 原始请求、初始材料和不可丢失上下文 |
| `ai-workspace/changes/{change}/LOG.md` | 高价值决定、替代关系、偏差和恢复事件的追加记录 |
| `ai-workspace/changes/{change}/...` | 各能力自己的主工件和子工件 |
| `ai-workspace/knowledge/decisions/` | 跨 change 的稳定决定 |
| `ai-workspace/knowledge/context/` | 可复用领域上下文与术语 |
| `ai-workspace/knowledge/research/` | 可复用研究结果与证据摘要 |
| `ai-workspace/archive/` | 经明确规则或授权归档的完成记录 |

所有路径使用正斜杠相对路径。不得使用机器绝对路径、反斜杠、空路径段或 `..`。

## change 命名与选择

change 使用：

```text
YYYY-MM-DD-<kebab-topic>
```

选择顺序：

1. 用户显式指定合法 change；
2. 未指定时，从 `ai-workspace/status.json` 恢复与当前能力匹配的唯一 active change；
3. 没有候选时创建新 change；
4. 同名存在时追加最小数字后缀；
5. 多个候选无法消歧时列出候选并停止，不自行猜测。

恢复必须读取 `.status.json` 和该能力的权威工件。模型记忆、聊天摘要或“继续上次”不能替代文件证据。

## 最小状态格式

全局状态至少包含：

```json
{
  "schema_version": 1,
  "active": [
    {
      "change": "2026-08-18-example",
      "capability": "能力名称",
      "phase": "active",
      "updated_at": "2026-08-18T00:00:00Z"
    }
  ]
}
```

change 状态至少包含：

```json
{
  "schema_version": 1,
  "change": "2026-08-18-example",
  "status": "active",
  "current_capability": "能力名称",
  "phase": "active",
  "owned_artifacts": [],
  "updated_at": "2026-08-18T00:00:00Z",
  "blockers": []
}
```

每份能力文档会进一步规定自己的 phase、owned artifacts 和 completed 条件。读取—合并—写入时保留未知字段，也不得覆盖其他能力的 active 条目。

## 持久化写入顺序

每次状态变化使用固定顺序：

```text
形成完整候选工件
→ 按文内门禁自检
→ 替换正式工件
→ 更新 change .status.json
→ 最后更新全局 status.json
→ 返回写入证据
```

工件与状态冲突时保持阻塞，列出冲突和恢复动作。不能为了继续流程而猜测哪个版本正确。

## 平台可写与不可写

### 平台可直接写文件

实际创建或更新 `ai-workspace/`，完成后返回：

- change；
- 当前 phase；
- 实际写入的相对路径；
- 已执行的内容门禁与结果；
- 阻塞项或下一步。

只有工具确认成功后才能声称“已持久化”。

### 平台无法直接写入文件

仍必须形成完整持久化交付。每个发生状态变化的回复都输出所有更新文件的完整内容，而不是只给摘要或 diff：

## 持久化交付

- 持久化状态：需要保存
- change：`<change>`
- 更新文件：列出全部路径

### FILE: ai-workspace/status.json

```json
{
  "schema_version": 1,
  "active": []
}
```

### FILE: ai-workspace/changes/<change>/.status.json

```json
{
  "schema_version": 1,
  "change": "<change>",
  "status": "active",
  "phase": "<phase>"
}
```

### FILE: ai-workspace/changes/<change>/<artifact>.md

```markdown
# 工件标题

完整工件内容。
```

这类 FILE bundle 是运行产物的运输形式，不是第二份能力定义。下一轮必须先读取用户保存后重新提供的文件，再继续；不能只依赖对话记忆。

## 每份文档必须说明的内容

一份合格能力文档应直接回答：

1. 解决什么问题，何时使用与不使用；
2. 用户至少需要提供什么；
3. 事实、推断、偏好与未知如何区分；
4. 必须按什么顺序工作；
5. 拥有哪些路径，读取哪些路径，不得修改哪些路径；
6. 首次运行怎样创建 change；
7. 暂停时写入哪些文件，恢复时读取哪些文件；
8. 完成时产生哪些工件，怎样更新状态；
9. 平台不可写时怎样输出完整文件包；
10. 高风险、证据不足、并发冲突和验证失败时怎样阻塞。

## 定义隔离规则

每份文档只保留一次项目地址。除此之外：

- 不出现其他网址；
- 不出现源项目名称或内部体系名称；
- 不出现源目录、源文件名、内部路径映射或内部脚本；
- 不出现来源清单、内容哈希、生成时间或源码标签；
- 不要求上传第二份能力文件；
- 不把源实现路径当作运行输出路径；
- 允许并要求出现 canonical 自己定义的 `ai-workspace/`、状态文件和运行工件。

## 多轮能力的要求

需要多轮交互时必须明确：

- 第一轮创建或更新哪些文件；
- 在哪里强制停止；
- 用户下一条消息需要回答什么；
- 恢复时读取哪些文件；
- 哪些内容不得提前输出；
- 用户已在初始输入中给出答案时如何跳过重复追问；
- 状态与工件不一致时如何阻塞；
- 完成后如何保留历史并清理 active 条目。

不能把“恢复快照”当作唯一状态。可复制快照只能在平台不可写时作为完整文件包的一部分。

## 内容质量门禁

交付前逐项确认：

- 第一条非空行是一级标题；
- 项目地址恰好出现一次，没有其他网址；
- 没有源项目目录、文件名、命令、脚本、来源标签或生成清单；
- 已定义 `ai-workspace/status.json` 与 change `.status.json`；
- 已列出能力拥有的具体工件路径；
- 已定义首次运行、暂停、恢复和完成状态；
- 已定义平台不可写时的完整 FILE bundle；
- 输出不是通用建议，而是可保存、可验证、可继续运行的工件；
- 无法执行的动作没有被写成已经完成；
- 正常、缺失输入、多个候选、证据不足和高风险场景都有明确处理。

## 使用方式

选择与任务匹配的一份能力文档，将它作为项目知识或对话指令上传，然后提供真实问题和材料。模型应先创建或恢复 `ai-workspace/` change，再按能力协议推进。每次状态变化都必须留下实际写入文件或完整可保存文件包。
