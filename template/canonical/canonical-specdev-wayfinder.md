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

Wayfinder 用于“尚不知道怎样安全形成 Spec 或实现路线”的场景。它保留共享地图、多会话领取、研究型 Ticket 和决策型 Ticket 的能力，但禁止把产品实现伪装成调查。

## 产物

- 共享地图：`specdev/changes/{change}/wayfinder-map.md`
- 调查 Ticket 目录：`specdev/changes/{change}/investigation/`
- 单个调查 Ticket：`specdev/changes/{change}/investigation/{investigation-id}.md`
- 调查 Evidence：`specdev/changes/{change}/investigation/evidence/`
- 全局领取状态：`specdev/status.json` 中当前 change 的 `claimed_investigations`

模板：

- 下方 `<investigation-ticket-template>` 标签
- 下方 `<wayfinder-map-template>` 标签

## 何时运行

- 路径未知，无法安全写出 Ready Spec 或 Ticket；
- 需要跨多个领域、技术栈或外部系统调查；
- 调查量超出单个上下文，适合并行研究；
- 存在多个相互依赖的高影响未知项；
- 需要在若干候选方案中先获得事实证据再做决定。

若问题只是一个可在当前上下文通过短暂只读探索回答的事实，不创建 Wayfinder Map。

## 流程

### 1. 定义目标与未知项

写明最终目标、已知边界、当前不能决定的事项和“为什么这些未知项阻塞规划”。未知项分为：

- **research**：答案可由代码、文档、实验或外部来源证实；
- **decision**：事实已足够，但需要用户或架构 owner 做取舍；
- **validation**：已有方案，需要实验验证关键可行性或风险；
- **mapping**：需要建立调用链、数据流、依赖图或影响面。

低影响实现细节不创建调查 Ticket。

### 2. 建立共享地图

使用 下方 `<wayfinder-map-template>` 标签 写入 `specdev/changes/{change}/wayfinder-map.md`：

- 每个 Ticket 只关闭一个高影响未知项；
- 写明依赖、owner、领取状态、停止条件和结果消费方；
- 构建调查 DAG，避免多个调查重复回答同一问题；
- 标记可并行调查和必须串行的决策点；
- 定义整体停止条件，不以“所有可能问题都研究完”为目标。

### 3. 领取与并行

调查者开始前原子地更新 `specdev/status.json` 的 `claimed_investigations`：

- 未领取且依赖满足 → 设置 owner、session 和 claimed 时间；
- 已领取 → 跳过并选择其他可用 Ticket；
- 超过配置的 claim 超时且无进展 → 允许在记录原因后回收；
- 完成或释放后从领取集合移除，并同步共享地图。

并行调查使用独立上下文；不要复制所有调查历史，只读取共享地图、当前调查 Ticket、相关上游工件和必要代码事实。

### 4. 执行调查

调查默认只读。允许：

- 代码搜索与静态分析；
- 文档、规范和官方来源研究；
- 可撤销的临时实验、最小原型或插桩；
- 性能测量、调用点扫描、schema 对比或兼容性验证。

外部研究使用 下方 `<research>` 标签。

禁止：

- 顺手实现产品功能；
- 提交未经审查的实验代码；
- 将原型视为最终架构；
- 在没有证据时把建议写成事实；
- 无停止条件地持续研究。

### 5. 记录结果与影响

每个调查结果区分：

- 官方或规范事实；
- 当前代码事实；
- 实验结果；
- 推断；
- 建议；
- 用户或 owner 决策。

写明来源、版本、置信度、适用范围、反例、仍未知项和对以下工件的影响：

- `specdev/changes/{change}/spec.md`；
- `specdev/changes/{change}/ADR.md`；
- `specdev/changes/{change}/ticket/NN-<ticket-name>.md`；
- `specdev/changes/{change}/diagnosis.md`。

调查完成、阻塞或释放时，同步调查 Ticket、调查 Evidence、共享地图和领取状态，并返回 investigation ID、状态及三份工件的完整路径。

状态使用 `open | claimed | confirmed | disproved | decision-needed | unresolved | superseded | cancelled`。

### 6. 收敛与退出

当剩余未知项不再阻止目标、行为、架构、风险或验证决策时停止。根据结果进入：

- 需要产品或架构取舍 → “设计访谈能力”；
- 外部行为已清楚 → “编写 Spec 阶段”；
- Spec 已 Ready 且只是实现拆分未知 → “拆分 Tickets 阶段”；
- Bug 根因路径已收敛 → “Bug 诊断阶段”；
- 仍存在高影响未知项 → 保持 blocked，并明确下一调查或用户决策。

长期有效且经实现验证的研究，只有在归档时由 “归档与沉淀阶段” 提升。

## 完成标准

- 共享地图、调查 Ticket 和领取状态一致；
- 每个调查只关闭一个高影响未知项；
- 结论区分事实、实验、推断、建议和决定；
- 来源、版本、置信度和停止条件可追踪；
- 并行调查没有重复领取或互相覆盖；
- 调查状态及 Ticket、Evidence、共享地图路径已返回；
- 没有把产品实现藏在调查中；
- 已明确下一 work 或阻塞决策。

## 子文件引用

- 调查 Ticket 模板：下方 `<investigation-ticket-template>` 标签
- 共享地图模板：下方 `<wayfinder-map-template>` 标签

---

## 参考内容

以下内容均已内联。主流程提到标签时，直接使用对应标签中的完整规则、模板或 schema。

<investigation-ticket-template>

## 产物 YAML 头部

生成该工件时，将以下字段写在文档开头的 YAML frontmatter 中：

```yaml
artifact: investigation-ticket
id: INV-01
type: research
status: open
blocked_by: []
owner: unassigned
claimed_by: null
claimed_at: null
```

# Investigation INV-01: <问题>

- **调查文件：** `specdev/changes/{change}/investigation/INV-01-<name>.md`
- **共享地图：** `specdev/changes/{change}/wayfinder-map.md`
- **Evidence：** `specdev/changes/{change}/investigation/evidence/INV-01.md`

## 1. 决策用途

- 要回答或决定什么：
- 为什么阻塞规划：
- 结果由哪个工件消费：

## 2. 已知事实与假设

### 已知事实

### 待验证假设

## 3. 调查契约

- **允许的代码探索：** `project/relative/path/**`
- **允许的实验：**
- **禁止的产品实现：**
- **来源优先级：**
- **停止条件：**
- **时间或资源边界：**

## 4. 结果

- **状态：** confirmed / disproved / decision-needed / unresolved / superseded
- **结论：**
- **证据：**
- **置信度：** high / medium / low
- **适用范围与版本：**
- **反例或限制：**
- **对 Spec 的影响：** 无 / `specdev/changes/{change}/spec.md`
- **对 ADR 的影响：** 无 / `specdev/changes/{change}/ADR.md`
- **对 Ticket 的影响：** 无 / `specdev/changes/{change}/ticket/NN-<ticket-name>.md`
- **下一步：**

</investigation-ticket-template>

<wayfinder-map-template>

## 产物 YAML 头部

生成该工件时，将以下字段写在文档开头的 YAML frontmatter 中：

```yaml
artifact: wayfinder-map
change: <YYYY-MM-DD-topic>
status: active
```

# Wayfinder Map: <目标>

- **共享地图：** `specdev/changes/{change}/wayfinder-map.md`
- **调查目录：** `specdev/changes/{change}/investigation/`
- **领取状态：** `specdev/status.json`

## 1. 最终目标与当前边界

## 2. 调查清单

| ID | Type | 问题 | 为什么高影响 | Blocked By | Owner/Claim | 状态 | Result |
|---|---|---|---|---|---|---|---|
| INV-01 | research | ... | ... | — | unassigned | open | `specdev/changes/{change}/investigation/INV-01-<name>.md` |

## 3. 调查 DAG

```text
INV-01
  ├─→ INV-02
  └─→ INV-03
```

## 4. 并行与领取规则

- 最大并发来自 `specdev/config.json`。
- 当前领取集合以 `specdev/status.json` 为权威。
- 同一调查 Ticket 只能有一个 owner/session。
- 共享地图是状态投影，领取变更后必须同步。

## 5. 决策收敛

| 未知项 | 当前结论 | 置信度 | 消费工件 | 是否仍阻塞 |
|---|---|---|---|---|

## 6. 停止条件

- [ ] 所有高影响未知项已 confirmed、disproved，或明确转为用户/owner 决策。
- [ ] 可以形成 Ready Spec、Ticket、诊断契约或架构决策。
- [ ] 没有把产品实现留在调查 Ticket 中。
- [ ] 所有 claim 已释放或转为明确 blocked。

</wayfinder-map-template>

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
