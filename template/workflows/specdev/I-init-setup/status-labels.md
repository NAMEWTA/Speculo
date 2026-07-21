# 状态标签

specdev 各 work 使用五种规范的状态角色来追踪工作项的生命周期。本文件将这些角色映射到持久化文件中使用的实际标签字符串。

| 角色 | 标签 | 含义 |
|------|------|------|
| `needs-triage` | `needs-triage` | 需要评估 —— 维护者需要判断此工作项的性质、优先级和归属 |
| `needs-info` | `needs-info` | 等待补充信息 —— 工作项描述不足，等待报告者或需求方提供更多上下文 |
| `ready-for-agent` | `ready-for-agent` | 可执行 —— 已完整定义，agent 无需额外人工上下文即可领取并开始工作 |
| `ready-for-human` | `ready-for-human` | 需人工处理 —— 工作项需要人工判断、审批或执行，不适合 agent 自动处理 |
| `wontfix` | `wontfix` | 不处理 —— 经评估后决定不予处理，保留记录以供追溯 |

## 使用方式

当 work 提及某个角色（例如"标记为需要评估"、"应用 ready-for-agent 状态"）时，使用此表中对应的标签字符串写入持久化文件。

标签字符串写入位置取决于具体 work：

- **T-tickets** —— 写入工作项文件（`tickets/NN-<slug>.md`）顶部的 `Status:` 行
- **W-wayfinder** —— 写入 `wayfinder/map.md` 中工作项的状态标记
- **其他 work** —— 在变更目录的相应产物文件中以 frontmatter 或元数据行形式记录

## 状态流转

```
needs-triage ──→ needs-info ──→ needs-triage ──→ ready-for-agent
     │                                                │
     │                                                ├──→ ready-for-human
     │                                                │
     └──────────────────→ wontfix ←──────────────────┘
```

- `needs-triage` → `needs-info`：评估后发现信息不足，退回补充
- `needs-triage` → `ready-for-agent`：已完整定义，可供 agent 执行
- `needs-triage` → `ready-for-human`：需要人工处理
- `needs-triage` → `wontfix`：决定不予处理
- `needs-info` → `needs-triage`：补充信息后重新评估
- `ready-for-agent` → `wontfix`：执行过程中发现不再适用

## 自定义标签

如果你的项目已有不同的标签命名习惯（例如使用 `bug:triage` 而不是 `needs-triage`），编辑右侧的"标签"列以匹配你实际使用的字符串。左侧的"角色"列不变——各 work 通过角色名引用状态，不直接依赖标签字符串。

例如，如果你的项目使用中文标签：

| 角色 | 标签 |
|------|------|
| `needs-triage` | `待评估` |
| `needs-info` | `待补充` |
| `ready-for-agent` | `可执行` |
| `ready-for-human` | `需人工` |
| `wontfix` | `不处理` |

确保标签字符串在实际使用位置（tickets 文件、wayfinder 地图等）保持一致。
