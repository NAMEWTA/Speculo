# 寻路

## 网页平台运行约定

本文是可独立上传的单文件能力快照，不依赖 Speculo CLI 的根别名或源目录。执行时统一采用以下逻辑布局：

- 项目根下的 `specdev/` 是状态区；全局配置与状态分别为 `specdev/config.json` 和 `specdev/status.json`。
- 当前 change 位于 `specdev/changes/{change}/`，其中 `{change}` 使用 `YYYY-MM-DD-<kebab-topic>`。
- 当前 change 的设计、规划和证据工件都写入该目录；永久 ADR、领域上下文和研究分别写入 `specdev/adr/`、`specdev/context/` 和 `specdev/research/`。
- `specdev/config.json` 或 `specdev/status.json` 不存在时，分别按下方 `<config-template>` 和 `<status-template>` 标签创建；新建 change 时按下方 `<change-status-template>` 标签创建 `.status.json`。对应 schema 用于结构核对。
- 项目代码与测试始终使用项目根相对路径；不写机器绝对路径。工件之间使用上述逻辑路径，不使用 Speculo 的运行时路径标签。
- 如果网页平台不能直接写项目文件，则按目标文件名输出完整内容，并在答复中明确应保存的位置；不得把“无法写文件”伪装成已经持久化。
- 若本地项目提供 Speculo Node 校验器，可运行它补充结构校验；纯网页环境按本文内联的 schema、Ready 清单和完成标准逐项核对，并明确记录未运行的自动校验。
- 提交、推送、合并、部署、发布、归档移动和不可逆迁移仍需用户明确授权。

一个模糊的想法出现了——太大而无法放入单个 Agent 会话，且从当前状态到**目的地**的路径尚不可见。寻路就是找到那条路，而非冲向目标。此 work 在 change state 中绘制一张**共享地图**，然后逐个处理其 Tickets，直到路径变得清晰。

目的地可能是一份待移交和迭代的 Spec、一个在规划开始前需锁定的决策，或一项经说明允许在地图中完成的变更。命名目的地是第一步，它塑造每个 Ticket。

## 核心纪律

### 规划，而非执行

Wayfinder 默认进行**规划**：每个 Ticket 解决一个决策，当地图完成时路径就清晰了——在某人动手之前没有任何剩余决定。想要直接动手通常说明已经到达地图边缘，是时候移交。只有地图“说明”明确覆盖此行为时，task 才能把解除阻塞的执行带入地图。

### 用名称引用

每张地图和每个 Ticket 都有一个名称。人类阅读的叙述和“已做出的决策”始终用名称引用；ID 和路径包裹在名称链接里，不以裸 `INV-01` 墙代替名称。

### 每会话一个 Ticket

无论绘制还是遍历，**每个会话绝不解决超过一个 Ticket**。绘制地图的会话不解决任何 Ticket；并行 research 的每个独立 Agent 也只负责一个 Ticket。

## 产物与适配

- 地图：`specdev/changes/{change}/wayfinder-map.md`
- 子 Tickets：`specdev/changes/{change}/investigation/`
- solution comments：`specdev/changes/{change}/investigation/comments/`
- assignment registry：`specdev/status.json` 的 `claimed_investigations`

每次绘制或遍历前加载 下方 `<local-tracker-contract>` 标签。Ticket 和地图模板：

- 下方 `<investigation-ticket-template>` 标签
- 下方 `<wayfinder-map-template>` 标签
- 下方 `<solution-comment-template>` 标签

## Ticket 类型

每个 Ticket 要么是 **HITL**，与一个代表自己发言的人类一起工作；要么是 **AFK**，由 Agent 独立驱动。HITL Ticket 只能通过实时交流解决，Agent 绝不代替人类一方发言。

- **Research（AFK）**：阅读文档、第三方 API 或知识库等资源，揭示某个决策等待的事实。调用 下方 `<research>` 标签。当需要当前工作目录之外的知识时使用。
- **Prototype（HITL）**：制作廉价、粗糙、具体的产物提高讨论保真度——大纲、粗略尝试、桩代码或 UI/逻辑原型。将原型链接为资产；当“它应是什么样”或“怎样表现”是关键问题时使用。
- **Grilling（HITL）**：对话。调用 “设计访谈能力” 的 grilling 与 domain-modeling 能力，但本会话只关闭当前 Wayfinder Ticket。
- **Task（HITL 或 AFK）**：在决策做出前必须完成的手动工作。它通过为决策解除阻塞赢得位置，不以交付目的地为目标。Agent 能独立驱动时使用 AFK，否则给人类精确清单。

Ticket label 只能是 `wayfinder:research | wayfinder:prototype | wayfinder:grilling | wayfinder:task`。

## 战争迷雾与范围

地图刻意不完整：不要绘制还看不到的内容。活跃 Tickets 之外是**战争迷雾**——能感觉即将到来、但依赖尚未解决问题而无法精确陈述的决策和调查。

**迷雾还是 Ticket？** 判断标准是现在能否精确陈述问题，而非现在能否回答：

- 问题已经清晰时做成 Ticket，即使仍被阻塞；
- 还无法精确表述时留在“尚未明确”，不预先切成 Ticket 大小碎片。

目的地固定范围。目标之外的工作进入**超出范围**，不是战争迷雾。范围之外永不升级；只有重新命名目的地并创建新 change 时才重新考虑。越界 Ticket 关闭为 `out-of-scope`，链接进“超出范围”，不进入“已做出的决策”。

## 调用模式

### 绘制地图

用户带着模糊想法调用：

1. **命名目的地。** 运行一轮 G 的 grilling/domain-modeling，确定正在寻路的 Spec、决策或变更。
2. **绘制前沿。** 再次质询，这次广度优先，在整个空间展开而非深入一条线索。如果没有浮现任何迷雾，停下并询问用户如何继续，不创建地图。
3. **创建地图。** 使用模板填写目的地和说明；“已做出的决策”为空，迷雾写入“尚未明确”。
4. **创建现在可明确的 Tickets。** 先创建全部 Ticket，再第二遍连接 `blocked_by`，因为 ID 必须先存在。
5. **派出 research Agent。** 每个 research Ticket 使用独立上下文和 claim，各自只解决一个 Ticket；需要 Git 分支时先取得对应授权。
6. 停止。绘制地图是一个会话的工作，它不亲手解决任何 Ticket。

**完成标准**：目的地、地图、当前可表述 Tickets、阻塞边和战争迷雾已持久化；绘图会话没有关闭 Ticket。

### 遍历地图

用户带来地图，可选指定 Ticket：

1. 加载地图的低分辨率视图，不加载每个 Ticket 正文。
2. 用户指定 Ticket 时使用它；否则按本地 tracker contract 查询并选择第一个 frontier Ticket。
3. 在任何工作前领取 Ticket。已领取时跳过并选择其他 frontier。
4. 按需缩放：只读取当前 Ticket、相关或已关闭 Ticket 的详情，以及“说明”指定的能力。
5. 解决当前唯一 Ticket，使用下一个未占用编号写 solution comment，原子关闭 Ticket 并释放 claim。
6. 在地图“已做出的决策”追加名称链接和一句概括；越界则写入“超出范围”。
7. 创建新浮现的 Tickets，第二遍连接阻塞；从“尚未明确”删除每个已升级补丁；更新或关闭被答案判定无效的 Tickets。

写回前重读地图、Ticket 与 claims，预期其他会话并发编辑。

**完成标准**：本会话只关闭一个 Ticket；Ticket、solution comment、claim、地图和新 frontier 一致。

## 收敛与路由

当前沿为空且“尚未明确”不再包含阻塞目的地的内容时，路径清晰：

- 需要产品或架构取舍：“设计访谈能力”；
- 外部行为已清楚：“编写 Spec 阶段”；
- Spec Ready、只需拆分：“拆分 Tickets 阶段”；
- Bug 根因路线收敛：“Bug 诊断阶段”；
- 仍有高影响未知项：保持 active/blocked 并返回下一 frontier Ticket 名称。

## 完成标准

- 目的地塑造每个 Ticket 并固定范围；
- 地图是低分辨率索引，不列开放 Tickets，不复制答案详情；
- 四类 Ticket 与 HITL/AFK 语义正确；
- frontier 由 open、unblocked、unclaimed 事实查询；
- 名称用于人类叙述，裸 ID 只作内部标识；
- 战争迷雾、Ticket 与超出范围按可精确表述性和范围区分；
- 每会话最多解决一个 Ticket，HITL 用户没有被 Agent 代答；
- 每个关闭 Ticket 有 solution comment，资产通过链接引用；
- claim、阻塞、地图与 Ticket 状态一致；
- 路径清晰时返回下一 work，不把产品实现藏进寻路。

## 子文件引用

- 本地 Tracker：下方 `<local-tracker-contract>` 标签
- Ticket 模板：下方 `<investigation-ticket-template>` 标签
- Solution comment：下方 `<solution-comment-template>` 标签
- 地图模板：下方 `<wayfinder-map-template>` 标签
- Ticket schema：下方 `<wayfinder-ticket-schema>` 标签

---

## 参考内容

以下内容均已内联。主流程提到标签时，直接使用对应标签中的完整规则、模板或 schema。

<investigation-ticket-template>

## 产物 YAML 头部

生成该工件时，将以下字段写在文档开头的 YAML frontmatter 中：

```yaml
artifact: wayfinder-ticket
id: INV-01
name: <精确问题名称>
parent_map: specdev/changes/{change}/wayfinder-map.md
label: wayfinder:grilling
status: open
blocked_by: []
resolution: null
```

# <精确问题名称>

## 问题

<此 Ticket 要解决的一个决策、调查或解除阻塞工作。>

</investigation-ticket-template>

<wayfinder-map-template>

## 产物 YAML 头部

生成该工件时，将以下字段写在文档开头的 YAML frontmatter 中：

```yaml
artifact: wayfinder-map
change: <YYYY-MM-DD-topic>
status: active
```

# Wayfinder Map: <地图名称>

## 目的地

<到达此地图终点时的样子——此工作正在寻路的 spec、决策或变更。一到两行；每个会话在挑选 Ticket 之前以其为定位。>

## 说明

<领域；每个会话应咨询的 skills；此工作的常设偏好；是否明确把执行带入地图。>

## 已做出的决策

<!-- 索引——每个已关闭 Ticket 一行：足以判断相关性，然后放大链接查看 solution comment 持有的详细信息。开放 Tickets 通过本地 tracker 查询，不列在这里。 -->

- **<已关闭 Ticket 标题>：** `specdev/changes/{change}/investigation/comments/INV-01/01-solution.md` —— <答案的一句话概括>

## 尚未明确

<!-- 范围内但尚无法精确表述为 Ticket 的战争迷雾；随着前沿推进而升级。 -->

## 超出范围

<!-- 被裁定在目的地之外的工作；已关闭，永不升级。 -->

</wayfinder-map-template>

<local-tracker-contract>

# Wayfinder 本地 Tracker 适配

最新版 Wayfinder 以 issue tracker 为物理载体。SpecDev 的默认 tracker 是 change state 内的本地 Markdown/JSON；本文件只映射物理原语，不改写 Wayfinder 的地图、Ticket、战争迷雾或遍历语义。

| Tracker 原语 | 本地实现 |
|---|---|
| 地图 issue | `specdev/changes/{change}/wayfinder-map.md` |
| 子 issue | `specdev/changes/{change}/investigation/{investigation-id}.md` |
| label | Ticket frontmatter 的 `wayfinder:research|prototype|grilling|task` |
| 阻塞关系 | Ticket frontmatter 的 `blocked_by` |
| assignment | `specdev/status.json` 当前 change 的 `claimed_investigations` |
| solution comment | `specdev/changes/{change}/investigation/comments/{investigation-id}/NN-solution.md` |
| 关闭 issue | Ticket frontmatter 的 `status: closed` 与 `resolution` |

## 查询前沿

扫描当前地图的全部子 Ticket。一个 Ticket 同时满足以下条件时属于**前沿**：

1. `status: open`；
2. `blocked_by` 中的每个 Ticket 都是 `status: closed`；
3. `claimed_investigations` 中没有相同 `id`。

按文件名中的数字 ID 升序返回。地图正文不缓存开放 Ticket 列表；每次选择前沿都从 Ticket 与 claim 事实重新查询。

## 原子领取

开始任何工作前，重读全局状态并原子写入 `id`、`owner`、可选 `session` 和 `claimed_at`。已领取则选择下一前沿 Ticket。写回结果前再次重读；完成、释放或取消时删除 claim。

Ticket 文件不重复保存 assignee，地图不重复保存 claim。全局 assignment registry 是领取的单一事实源。

## 解决方案评论

Ticket 正文只保存问题。答案写入下一个未占用的 solution comment 文件，资产从评论链接，不粘贴进 Ticket。关闭 Ticket 后，地图的“已做出的决策”只追加名称链接和一句概括；`out-of-scope` 不进入决策索引。

**完成标准**：地图、Ticket、claim、阻塞和 solution comment 可以重建相同前沿；同一事实没有第二份可写副本。

</local-tracker-contract>

<solution-comment-template>

## 产物 YAML 头部

生成该工件时，将以下字段写在文档开头的 YAML frontmatter 中：

```yaml
artifact: wayfinder-solution-comment
ticket: INV-01
sequence: 1
resolution: answered
```

# Solution: <Ticket 名称>

- **Ticket：** `specdev/changes/{change}/investigation/INV-01.md`
- **答案：** <此 Ticket 关闭的决定或已完成的解除阻塞工作>
- **事实与来源：**
- **资产：** 无 / `project/relative/path` / `<Url>https://example.com</Url>`
- **后续 Ticket 所依赖的事实：** 无 / ...
- **新浮现的 Tickets：** 无 / <按名称列出>
- **升级的战争迷雾：** 无 / ...
- **对现有 Tickets 的影响：** 无 / update / close / supersede

</solution-comment-template>

<research>

# SpecDev Research

## 触发

当外部 API、库版本、协议、法规、产品能力或最佳实践会改变设计/实现决策，且当前材料不足时使用。

## 流程

1. 写清楚要支持的具体决策和停止条件。
2. 优先官方文档、规范、源代码、论文或维护者材料；技术问题优先一手来源。
3. 核对版本、发布日期、适用环境和已知限制。
4. 区分：来源明确事实、代码库事实、推断、建议。
5. 对关键结论至少交叉验证；来源冲突时并列呈现，不强行调和。
6. 记录摘要、证据、置信度、对 ADR/Spec/Ticket 的影响和仍未知项。
7. 长期有效且经实现验证后才可由 Archive 提升到永久 research。

## 输出模板

```markdown
# Research: <问题>
- 决策用途：
- 范围/版本：
- 停止条件：

## Findings
### R-001
- 结论：
- 类型：官方事实 / 代码事实 / 推断 / 建议
- 来源：
- 置信度：high / medium / low
- 适用限制：
- 对工件影响：

## Conflicts and Unknowns
## Recommendation
```

不得长篇复制受版权保护的来源；使用短引文和自己的准确摘要。

</research>

<config-template>

```json
{
  "schema_version": 3,
  "interaction_language": "zh-CN",
  "artifact_language": "zh-CN",
  "git": {
    "auto_commit": false,
    "default_branch": null,
    "worktree_for_parallel": true
  },
  "execution": {
    "max_parallel": 3,
    "deep_ticket_human_approval": true,
    "shared_path_owner": "lead"
  },
  "verification": {
    "test": null,
    "typecheck": null,
    "lint": null,
    "build": null
  },
  "planning": {
    "default_depth": "standard",
    "require_ready_gate": true,
    "require_evidence": true
  }
}
```

</config-template>

<config-schema>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:speculo:specdev:config:v3",
  "title": "SpecDev Configuration",
  "type": "object",
  "required": ["schema_version", "interaction_language", "artifact_language", "git", "execution", "verification", "planning"],
  "properties": {
    "schema_version": {"const": 3},
    "interaction_language": {"type": "string", "minLength": 1},
    "artifact_language": {"type": "string", "minLength": 1},
    "git": {
      "type": "object",
      "required": ["auto_commit", "default_branch", "worktree_for_parallel"],
      "properties": {
        "auto_commit": {"type": "boolean"},
        "default_branch": {"type": ["string", "null"]},
        "worktree_for_parallel": {"type": "boolean"}
      },
      "additionalProperties": true
    },
    "execution": {
      "type": "object",
      "required": ["max_parallel", "deep_ticket_human_approval", "shared_path_owner"],
      "properties": {
        "max_parallel": {"type": "integer", "minimum": 1},
        "deep_ticket_human_approval": {"type": "boolean"},
        "shared_path_owner": {"type": "string", "minLength": 1}
      },
      "additionalProperties": true
    },
    "verification": {
      "type": "object",
      "required": ["test", "typecheck", "lint", "build"],
      "properties": {
        "test": {"type": ["string", "null"]},
        "typecheck": {"type": ["string", "null"]},
        "lint": {"type": ["string", "null"]},
        "build": {"type": ["string", "null"]}
      },
      "additionalProperties": true
    },
    "planning": {
      "type": "object",
      "required": ["default_depth", "require_ready_gate", "require_evidence"],
      "properties": {
        "default_depth": {"enum": ["lite", "standard", "deep"]},
        "require_ready_gate": {"type": "boolean"},
        "require_evidence": {"type": "boolean"}
      },
      "additionalProperties": true
    }
  },
  "additionalProperties": true
}
```

</config-schema>

<status-template>

```json
{
  "schema_version": 3,
  "workflow": "specdev",
  "active": [],
  "work_history": [],
  "completed": []
}
```

</status-template>

<status-schema>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:speculo:specdev:status:v3",
  "title": "SpecDev Global Status",
  "type": "object",
  "required": [
    "schema_version",
    "workflow",
    "active",
    "work_history",
    "completed"
  ],
  "properties": {
    "schema_version": {
      "const": 3
    },
    "workflow": {
      "const": "specdev"
    },
    "active": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "change",
          "current_work",
          "works_run",
          "result"
        ],
        "properties": {
          "change": {
            "type": "string"
          },
          "current_work": {
            "type": [
              "string",
              "null"
            ]
          },
          "works_run": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "result": {
            "type": [
              "string",
              "null"
            ]
          },
          "claimed_investigations": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "id",
                "owner",
                "claimed_at"
              ],
              "properties": {
                "id": {
                  "type": "string"
                },
                "owner": {
                  "type": "string"
                },
                "session": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "claimed_at": {
                  "type": "string"
                }
              },
              "additionalProperties": true
            }
          }
        },
        "additionalProperties": true
      }
    },
    "work_history": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "change",
          "work_id",
          "started_at",
          "completed_at",
          "result"
        ],
        "properties": {
          "change": {
            "type": "string"
          },
          "work_id": {
            "type": "string",
            "pattern": "^specdev/"
          },
          "started_at": {
            "type": "string"
          },
          "completed_at": {
            "type": [
              "string",
              "null"
            ]
          },
          "result": {
            "type": [
              "string",
              "null"
            ]
          }
        },
        "additionalProperties": true
      }
    },
    "completed": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "change",
          "archived_at",
          "archive_path"
        ],
        "properties": {
          "change": {
            "type": "string"
          },
          "archived_at": {
            "type": "string"
          },
          "archive_path": {
            "type": "string",
            "pattern": "^specdev/archive/[0-9]{4}-[0-9]{2}/.+/$"
          }
        },
        "additionalProperties": true
      }
    }
  },
  "additionalProperties": true
}
```

</status-schema>

<change-status-template>

```json
{
  "schema_version": 3,
  "artifact": "change-status",
  "change": "<YYYY-MM-DD-topic>",
  "change_status": "active",
  "current_work": null,
  "created_at": "<ISO-8601>",
  "updated_at": "<ISO-8601>",
  "completed_at": null,
  "archived": false,
  "archive_path": null,
  "blockers": [],
  "deviations": [],
  "worktrees": []
}
```

</change-status-template>

<change-status-schema>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:speculo:specdev:change-status:v3",
  "title": "SpecDev Change Status",
  "type": "object",
  "required": [
    "schema_version",
    "artifact",
    "change",
    "change_status",
    "current_work",
    "created_at",
    "updated_at",
    "completed_at",
    "archived",
    "archive_path",
    "blockers",
    "deviations"
  ],
  "properties": {
    "schema_version": {
      "const": 3
    },
    "artifact": {
      "const": "change-status"
    },
    "change": {
      "type": "string",
      "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$"
    },
    "change_status": {
      "enum": [
        "active",
        "blocked",
        "completed",
        "archived"
      ]
    },
    "current_work": {
      "type": [
        "string",
        "null"
      ]
    },
    "created_at": {
      "type": "string",
      "minLength": 1
    },
    "updated_at": {
      "type": "string",
      "minLength": 1
    },
    "completed_at": {
      "type": [
        "string",
        "null"
      ]
    },
    "archived": {
      "type": "boolean"
    },
    "archive_path": {
      "anyOf": [
        {
          "type": "null"
        },
        {
          "type": "string",
          "pattern": "^specdev/archive/[0-9]{4}-[0-9]{2}/.+/$"
        }
      ]
    },
    "blockers": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "deviations": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "worktrees": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "ticket_id",
          "owner",
          "provider",
          "base_sha",
          "branch",
          "workspace_ref",
          "status",
          "updated_at"
        ],
        "properties": {
          "ticket_id": {
            "type": "string",
            "pattern": "^T-[0-9]{2,}$"
          },
          "owner": {
            "type": "string",
            "minLength": 1
          },
          "provider": {
            "enum": [
              "native",
              "git",
              "external"
            ]
          },
          "base_sha": {
            "type": "string",
            "minLength": 1
          },
          "branch": {
            "type": "string",
            "minLength": 1
          },
          "workspace_ref": {
            "type": "string",
            "minLength": 1,
            "pattern": "^(?!/)(?![A-Za-z]:[\\\\/]).+"
          },
          "status": {
            "enum": [
              "planned",
              "active",
              "review",
              "integrated",
              "removed",
              "blocked"
            ]
          },
          "updated_at": {
            "type": "string",
            "minLength": 1
          }
        },
        "additionalProperties": true
      }
    }
  },
  "allOf": [
    {
      "if": {
        "properties": {
          "change_status": {
            "const": "archived"
          }
        }
      },
      "then": {
        "properties": {
          "archived": {
            "const": true
          },
          "archive_path": {
            "type": "string",
            "pattern": "^specdev/archive/[0-9]{4}-[0-9]{2}/.+/$"
          }
        }
      }
    }
  ],
  "additionalProperties": true
}
```

</change-status-schema>

<wayfinder-ticket-schema>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:speculo:specdev:wayfinder-ticket:v1",
  "title": "SpecDev Wayfinder Ticket Frontmatter",
  "type": "object",
  "required": ["artifact", "id", "name", "parent_map", "label", "status", "blocked_by", "resolution"],
  "properties": {
    "artifact": { "const": "wayfinder-ticket" },
    "id": { "type": "string", "pattern": "^INV-[0-9]{2,}$" },
    "name": { "type": "string", "minLength": 1 },
    "parent_map": { "type": "string", "minLength": 1 },
    "label": { "enum": ["wayfinder:research", "wayfinder:prototype", "wayfinder:grilling", "wayfinder:task"] },
    "status": { "enum": ["open", "closed"] },
    "blocked_by": { "type": "array", "items": { "type": "string", "pattern": "^INV-[0-9]{2,}$" } },
    "resolution": { "enum": [null, "answered", "out-of-scope", "superseded", "cancelled"] }
  },
  "additionalProperties": false
}
```

</wayfinder-ticket-schema>
