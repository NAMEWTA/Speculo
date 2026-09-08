# 探索大需求与 Change 边界

## 网页平台运行约定

本文是可独立上传的单文件能力快照，不依赖 Speculo CLI 的根别名或源目录。执行时统一采用以下逻辑布局：

- 项目根下的 `specdev/` 是状态区；全局配置与状态分别为 `specdev/config.json` 和 `specdev/status.json`。
- 当前 change 位于 `specdev/changes/{change}/`，其中 `{change}` 使用 `YYYY-MM-DD-<kebab-topic>`。
- 当前 change 的设计、规划和证据工件都写入该目录；永久 ADR、领域上下文和研究分别写入 `specdev/adr/`、`specdev/context/` 和 `specdev/research/`。
- `specdev/config.json` 或 `specdev/status.json` 不存在时，分别按下方 `<config-template>` 和 `<status-template>` 标签创建；新建 change 时按下方 `<change-status-template>` 标签创建 `.status.json`。对应 schema 用于结构核对。
- 项目代码与测试始终使用项目根相对路径；不写机器绝对路径。工件之间使用上述逻辑路径，不使用 Speculo 的运行时路径标签。
- 如果网页平台不能直接写项目文件，则按目标文件名输出完整内容，并在答复中明确应保存的位置；不得把“无法写文件”伪装成已经持久化。
- 若本地项目提供 Speculo Node 校验器，可运行它补充结构校验；纯网页环境按本文内联的 schema、Ready 清单和完成标准逐项核对，并明确记录未运行的自动校验。
- 本地只读 Goal 控制器和 Plan 合同校验库不随网页快照提供，不能把其名称当作可执行命令。网页执行者按内联 map-control/调用合同逐项计算依赖与门禁；缺少真实项目 Skill 源或执行能力时阻塞对应任务，不声称自动验证通过。
- 提交、推送、合并、部署、发布、归档移动和不可逆迁移仍需用户明确授权。

> 激活后读取 SpecDev 的激活合同。

W 位于 change 形成之前：Initiative → 候选 change → 各自 Grill → Spec → Tickets → 一个或多个 change 的 Goal。探索载体继续使用普通 change 目录，不增加另一套全局状态根；它不等于最终产品 change。

## 读取范围

先读 下方 `<activation-and-memory>` 标签；读取共享地图、当前问题与依赖索引，只回读命中原文。低分辨率地图不缓存所有开放票正文。

## 分支

| 当前需要 | 按需读取 |
|---|---|
| 初次绘制问题空间，或划分多个 change | 下方 `<ref-w-wayfinder-references-initiative-discovery>` 标签 |
| 领取并解决一个调查问题，或恢复既有地图 | 下方 `<ref-w-wayfinder-references-map-traversal>` 标签 和 下方 `<local-tracker-contract>` 标签 |
| 生成地图、问题与答案 | 下方 `<wayfinder-map-template>` 标签、下方 `<investigation-ticket-template>` 标签、下方 `<solution-comment-template>` 标签 |
| 选定清晰 change 交给 Goal | 下方 `<ref-w-wayfinder-references-initiative-discovery>` 标签 的交接门禁 |

## 必留纪律

- 目的地约束所有调查；能精确陈述的问题成为调查票，尚不能陈述的留在战争迷雾，目标外内容不自动升级。
- 默认每个会话最多解决一个调查 Ticket；绘图会话不关闭调查票。这个限制约束 W，不限制 P 的长期 Goal 调度；不静默减少用户明确要求的交付数量。
- 四类保持 `wayfinder:research`、`wayfinder:prototype`、`wayfinder:grilling`、`wayfinder:task`。HITL 必须真人参与，Agent 不代答；Task 仅解除调查阻塞，不偷做目的地实现。
- `claimed_investigations` 仍由探索载体的 change 状态唯一拥有。先领取后执行；他人已领取的问题跳过，不接管；只暂停有归属冲突的部分。
- 每个 materialized change 拥有自己的 design-tree、LOG、CONTEXT、ADR、Spec 与 tickets-map。共享探索答案通过 solution comment 引用，不复制成多个可写事实源。
- 缺失关键决定或必需证据时保持该 change 未就绪；其他独立清晰 change 可以交接，不要求整个大需求一次揭完迷雾。

## 校验与交接

存在多个候选 change 时，由 W 写 `specdev/changes/{change}/initiative.json`；使用 下方 `<ref-w-wayfinder-references-initiative-template>` 标签 和 下方 `<ref-common-schemas-initiative-schema>` 标签。目标 change 只在用户接受边界后创建，不能挪用已属于其他任务的状态。

运行 Speculo Node 校验器 的 `--stage wayfinder` 校验地图、claim、评论和 initiative；选定成员必须分别满足 Grill 共识、Ready Spec 和 Ready Tickets，再转交 “目标规划阶段”。W 不把“地图完成”宣称为产品已经交付。

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

## Change 边界入口

存在多个候选 change 时，W 创建并按需读取 `specdev/changes/{change}/initiative.json`；地图不复制其中的候选或子状态。每个目标 change 的 Grill/Spec/Ticket 独立拥有，交接规则见 下方 `<ref-w-wayfinder-references-initiative-discovery>` 标签。

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
| assignment | `specdev/changes/{change}/.status.json` 的 `claimed_investigations` |
| solution comment | `specdev/changes/{change}/investigation/comments/{investigation-id}/NN-solution.md` |
| 关闭 issue | Ticket frontmatter 的 `status: closed` 与 `resolution` |

## 查询前沿

扫描当前地图的全部子 Ticket。一个 Ticket 同时满足以下条件时属于**前沿**：

1. `status: open`；
2. `blocked_by` 中的每个 Ticket 都是 `status: closed`；
3. `claimed_investigations` 中没有相同 `id`。

按文件名中的数字 ID 升序返回。地图正文不缓存开放 Ticket 列表；每次选择前沿都从 Ticket 与 claim 事实重新查询。

## 原子领取

开始任何工作前，重读当前 change 状态并原子写入 `id`、`owner`、可选 `session` 和 `claimed_at`。已领取则选择下一前沿 Ticket。写回结果前再次重读；完成、释放或取消时删除 claim。

Ticket 文件不重复保存 assignee，地图不重复保存 claim。change assignment registry 是领取的单一事实源。

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

## 输入

- `decision`：研究要支持的一个具体决定；
- `questions`：需要回答的穷尽问题集；
- `stop_condition`：何时证据已足够；
- `caller`：D、G、S、W、R、T 或 I；
- `target_artifact`：调用方拥有且将接收结果的完整 Path。

缺少 owner 或 target 时返回阻塞，不创建 `{change}/research/` 等共享 namespace。

## 流程

1. 固定问题、版本、环境和停止条件。
2. 优先官方文档、规范、源代码、论文或维护者材料；技术问题使用一手来源。
3. 核对发布日期、版本、适用环境、限制和已知冲突。
4. 对每个会改变决定的实质声明就近给出来源；关键结论交叉验证，来源冲突时并列呈现。
5. 区分来源事实、代码库事实、推断、建议和未知项。
6. 返回一个 Markdown block，由 caller 原子写入 `target_artifact`；本 Skill 不自行写 state。

## 输出

```markdown
## Research: <问题>
- Decision / target:
- Scope / version:
- Stop condition:

### R-001
- Claim:
- Type: official fact / code fact / inference / recommendation
- Source:
- Confidence:
- Limits:
- Artifact impact:

### Conflicts and Unknowns
### Recommendation
```

不得长篇复制受版权保护内容。长期有效且经实现验证的结论只能由 Archive 从调用方工件提升到永久 research。

## 完成标准

- 每个输入问题有答案或明确未知；
- 每个实质声明就近引用一手来源；
- 版本、限制、冲突和置信度已记录；
- 结果有唯一 owning artifact；
- 本 Skill 没有创建自己的 state 路径。

</research>

<config-template>

```json
{
  "schema_version": 5,
  "interaction_language": "zh-CN",
  "artifact_language": "zh-CN",
  "git": {
    "default_branch": null
  },
  "execution": {
    "max_implementation_agents": 3,
    "max_integration_attempts": 3,
    "deep_ticket_human_approval": true,
    "shared_path_owner": "explicit"
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
    "require_evidence": true,
    "ui_design_default_candidates": 3,
    "ui_design_max_candidates": 4
  }
}
```

</config-template>

<config-schema>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:speculo:specdev:config:v5",
  "title": "SpecDev Configuration",
  "type": "object",
  "required": ["schema_version", "interaction_language", "artifact_language", "git", "execution", "verification", "planning"],
  "properties": {
    "schema_version": {"const": 5},
    "interaction_language": {"type": "string", "minLength": 1},
    "artifact_language": {"type": "string", "minLength": 1},
    "git": {
      "type": "object",
      "required": ["default_branch"],
      "properties": {
        "default_branch": {"type": ["string", "null"]}
      },
      "additionalProperties": false
    },
    "execution": {
      "type": "object",
      "required": ["max_implementation_agents", "max_integration_attempts", "deep_ticket_human_approval", "shared_path_owner"],
      "properties": {
        "max_implementation_agents": {"type": "integer", "minimum": 1},
        "max_integration_attempts": {"type": "integer", "minimum": 1},
        "deep_ticket_human_approval": {"type": "boolean"},
        "shared_path_owner": {"type": "string", "minLength": 1}
      },
      "additionalProperties": false
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
      "required": ["default_depth", "require_ready_gate", "require_evidence", "ui_design_default_candidates", "ui_design_max_candidates"],
      "properties": {
        "default_depth": {"enum": ["lite", "standard", "deep"]},
        "require_ready_gate": {"type": "boolean"},
        "require_evidence": {"type": "boolean"},
        "ui_design_default_candidates": {"type": "integer", "minimum": 2, "maximum": 4},
        "ui_design_max_candidates": {"type": "integer", "minimum": 2, "maximum": 4}
      },
      "additionalProperties": true
    }
  },
  "allOf": [{
    "$comment": "ui_design_default_candidates <= ui_design_max_candidates is enforced by validate-specdev.mjs because JSON Schema cannot compare sibling numeric values."
  }],
  "additionalProperties": false
}
```

</config-schema>

<status-template>

```json
{
  "schema_version": 5,
  "workflow": "specdev",
  "active": [],
  "archived": []
}
```

</status-template>

<status-schema>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:speculo:specdev:status:v5",
  "title": "SpecDev Global Status",
  "type": "object",
  "required": ["schema_version", "workflow", "active", "archived"],
  "properties": {
    "schema_version": {"const": 5},
    "workflow": {"const": "specdev"},
    "active": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["change"],
        "properties": {
          "change": {
            "type": "string",
            "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$"
          }
        },
        "additionalProperties": false
      },
      "uniqueItems": true
    },
    "archived": {
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$"
      },
      "uniqueItems": true
    }
  },
  "additionalProperties": false
}
```

</status-schema>

<change-status-template>

```json
{
  "schema_version": 6,
  "artifact": "change-status",
  "change": "<YYYY-MM-DD-topic>",
  "change_status": "active",
  "current_work": null,
  "works_run": [],
  "claimed_investigations": [],
  "execution_authorization": {
    "implementation_commit": {"status": "not-authorized", "source": null, "granted_at": null, "scope": "Ticket implementation commits"},
    "local_candidate_integration": {"status": "not-authorized", "source": null, "granted_at": null, "scope": "Lead-owned local direct-parent or candidate integration and parent update"},
    "source_cleanup": {"status": "not-authorized", "source": null, "granted_at": null, "scope": "Source worktree and branch cleanup"}
  },
  "leadership": {
    "current": "<owner-or-session-locator>",
    "epoch": 1,
    "assigned_at": "<ISO-8601>",
    "history": []
  },
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
  "$id": "urn:speculo:specdev:change-status:v6",
  "title": "SpecDev Change Status",
  "type": "object",
  "required": [
    "schema_version", "artifact", "change", "change_status", "current_work", "works_run",
    "claimed_investigations", "execution_authorization", "leadership", "created_at", "updated_at",
    "completed_at", "archived", "archive_path", "blockers", "deviations", "worktrees"
  ],
  "properties": {
    "schema_version": {"const": 6},
    "artifact": {"const": "change-status"},
    "change": {"type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$"},
    "change_status": {"enum": ["active", "blocked", "completed", "archived"]},
    "current_work": {"type": ["string", "null"], "pattern": "^specdev/"},
    "works_run": {"type": "array", "items": {"type": "string", "pattern": "^specdev/"}, "uniqueItems": true},
    "claimed_investigations": {"type": "array", "items": {"$ref": "#/$defs/claim"}},
    "execution_authorization": {"$ref": "#/$defs/authorization"},
    "leadership": {"$ref": "#/$defs/leadership"},
    "created_at": {"type": "string", "minLength": 1},
    "updated_at": {"type": "string", "minLength": 1},
    "completed_at": {"type": ["string", "null"]},
    "archived": {"type": "boolean"},
    "archive_path": {"anyOf": [{"type": "null"}, {"type": "string", "pattern": "^specdev/archive/[0-9]{4}-[0-9]{2}/.+/$"}]},
    "blockers": {"type": "array", "items": {"type": "string"}},
    "deviations": {"type": "array", "items": {"type": "string"}},
    "worktrees": {"type": "array", "items": {"$ref": "#/$defs/worktree"}}
  },
  "$defs": {
    "claim": {
      "type": "object",
      "required": ["id", "owner", "session", "claimed_at"],
      "properties": {
        "id": {"type": "string", "minLength": 1},
        "owner": {"type": "string", "minLength": 1},
        "session": {"type": ["string", "null"]},
        "claimed_at": {"type": "string", "minLength": 1}
      },
      "additionalProperties": false
    },
    "authorization-entry": {
      "type": "object",
      "required": ["status", "source", "granted_at", "scope"],
      "properties": {
        "status": {"enum": ["authorized", "not-authorized", "revoked"]},
        "source": {"type": ["string", "null"]},
        "granted_at": {"type": ["string", "null"]},
        "scope": {"type": "string", "minLength": 1}
      },
      "allOf": [{
        "if": {"properties": {"status": {"const": "authorized"}}, "required": ["status"]},
        "then": {"properties": {"source": {"type": "string", "minLength": 1}, "granted_at": {"type": "string", "minLength": 1}}}
      }],
      "additionalProperties": false
    },
    "authorization": {
      "type": "object",
      "required": ["implementation_commit", "local_candidate_integration", "source_cleanup"],
      "properties": {
        "implementation_commit": {"$ref": "#/$defs/authorization-entry"},
        "local_candidate_integration": {"$ref": "#/$defs/authorization-entry"},
        "source_cleanup": {"$ref": "#/$defs/authorization-entry"}
      },
      "additionalProperties": false
    },
    "leadership-history": {
      "type": "object",
      "required": ["owner", "epoch", "assigned_at", "ended_at"],
      "properties": {
        "owner": {"type": "string", "minLength": 1},
        "epoch": {"type": "integer", "minimum": 1},
        "assigned_at": {"type": "string", "minLength": 1},
        "ended_at": {"type": "string", "minLength": 1}
      },
      "additionalProperties": false
    },
    "leadership": {
      "type": "object",
      "required": ["current", "epoch", "assigned_at", "history"],
      "properties": {
        "current": {"type": "string", "minLength": 1},
        "epoch": {"type": "integer", "minimum": 1},
        "assigned_at": {"type": "string", "minLength": 1},
        "history": {"type": "array", "items": {"$ref": "#/$defs/leadership-history"}}
      },
      "additionalProperties": false
    },
    "full-suite": {
      "type": "object",
      "required": ["required", "status", "reason", "evidence"],
      "properties": {
        "required": {"type": "boolean"},
        "status": {"enum": ["not-required", "pending", "passed", "failed"]},
        "reason": {"type": ["string", "null"]},
        "evidence": {"type": ["string", "null"]}
      },
      "allOf": [{
        "if": {"properties": {"required": {"const": false}}, "required": ["required"]},
        "then": {"properties": {"status": {"const": "not-required"}, "reason": {"type": "string", "minLength": 1}}}
      }],
      "additionalProperties": false
    },
    "worktree": {
      "type": "object",
      "required": ["ticket_id", "owner", "implementation_owner", "integration_owner", "provider", "base_sha", "parent_branch", "branch", "workspace_ref", "source_checkpoint", "integration", "status", "updated_at"],
      "properties": {
        "ticket_id": {"type": "string", "pattern": "^T-[0-9]{2,}$"},
        "owner": {"type": "string", "minLength": 1},
        "implementation_owner": {"type": "string", "minLength": 1},
        "integration_owner": {"type": "string", "minLength": 1},
        "provider": {"const": "git"},
        "base_sha": {"type": "string", "minLength": 1},
        "parent_branch": {"type": "string", "minLength": 1},
        "branch": {"type": "string", "minLength": 1},
        "workspace_ref": {"type": "string", "pattern": "^(?:current|specdev-worktree/[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*/T-[0-9]{2,})$"},
        "source_checkpoint": {"type": ["string", "null"]},
        "integration": {"$ref": "#/$defs/integration"},
        "status": {"enum": ["planned", "active", "review", "integrating", "integrated", "removed", "blocked"]},
        "updated_at": {"type": "string", "minLength": 1}
      },
      "allOf": [
        {
          "if": {"properties": {"workspace_ref": {"const": "current"}}, "required": ["workspace_ref"]},
          "then": {
            "properties": {
              "integration": {
                "allOf": [{
                  "properties": {
                    "candidate_sha": {"const": null},
                    "candidate_tree_sha": {"const": null},
                    "candidate_branch": {"const": null},
                    "candidate_workspace_ref": {"const": null},
                    "method": {"enum": [null, "direct-parent"]}
                  }
                }]
              }
            }
          },
          "else": {
            "properties": {
              "integration": {
                "allOf": [{"properties": {"method": {"enum": [null, "fast-forward", "merge-commit"]}}}]
              }
            }
          }
        }
      ],
      "additionalProperties": false
    },
    "integration": {
      "type": "object",
      "required": ["status", "parent_ref", "parent_before_sha", "source_sha", "candidate_sha", "candidate_tree_sha", "candidate_branch", "candidate_workspace_ref", "result_sha", "method", "conflict_paths", "verification", "full_suite", "e2e", "evidence", "attempts", "promotion_status"],
      "properties": {
        "status": {"enum": ["pending", "candidate", "passed", "failed", "stale"]},
        "parent_ref": {"type": ["string", "null"]},
        "parent_before_sha": {"type": ["string", "null"]},
        "source_sha": {"type": ["string", "null"]},
        "candidate_sha": {"type": ["string", "null"]},
        "candidate_tree_sha": {"type": ["string", "null"]},
        "candidate_branch": {"type": ["string", "null"]},
        "candidate_workspace_ref": {"anyOf": [{"type": "null"}, {"type": "string", "pattern": "^specdev-worktree/\\.integration/[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*/T-[0-9]{2,}$"}]},
        "result_sha": {"type": ["string", "null"]},
        "method": {"enum": [null, "direct-parent", "fast-forward", "merge-commit"]},
        "conflict_paths": {"type": "array", "items": {"type": "string"}},
        "verification": {"enum": ["pending", "passed", "failed"]},
        "full_suite": {"$ref": "#/$defs/full-suite"},
        "e2e": {"$ref": "#/$defs/full-suite"},
        "evidence": {"type": "string", "pattern": "^\\{roots\\.state\\}/specdev/changes/[^<]+/evidence/T-[0-9]{2,}\\.md$"},
        "attempts": {"type": "integer", "minimum": 0},
        "promotion_status": {"enum": ["pending", "applying", "applied", "failed", "stale"]}
      },
      "additionalProperties": false
    }
  },
  "allOf": [{
    "if": {"properties": {"change_status": {"const": "archived"}}, "required": ["change_status"]},
    "then": {"properties": {"archived": {"const": true}, "archive_path": {"type": "string", "pattern": "^specdev/archive/[0-9]{4}-[0-9]{2}/.+/$"}}}
  }],
  "additionalProperties": false
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

<activation-and-memory>

# Activation and memory retrieval protocol

本规则只在用户明确激活当前 workflow 或某个 Work 后读取。INDEX 只用于被动发现，不初始化状态、不读取 active change、不写入知识。

## Locate before read

1. 先解析当前 workflow 的 roots、状态索引和稳定 ID；不存在时静默跳过，不能凭旧路径猜测。
2. 根据当前请求、Work 分支、关键词、稳定 ID、状态和 provenance，先搜索相关索引行或目录项，再定位最小相关 entry；不把索引全文默认装入上下文。
3. 只回读命中的 entry 和直接 provenance；需要恢复、冲突裁决、归档、迁移或执行安全证明时，才读取该阶段声明的完整证据集合。
4. 没有匹配证据时返回缺失证据并停止依赖该结论的分支，不补造事实。

## Memory writes

正式知识、永久 context、synthesis 或 archive 写入前，先解析唯一 owner 与 gateway，检查 pending transaction、lock、未完成 promotion 和 recovery evidence。gateway 不明或事务未闭合时，只阻塞记忆写入，继续独立且已授权的审计、定位、验证和其他工作。

每次写入必须记录 source IDs、证据定位、验证时间或 digest；写入后定位受影响索引项并重新读取目标 entry，确认 owner、locator、内容和状态投影一致。原始证据不可被派生视图覆盖。

## Read budget

当前 Work 的权威状态、schema、Map/Plan、当前输入和直接所有权合同可以完整读取；非当前分支的知识树、历史 change、研究库、项目 Skill 和示例只按索引与关键词读取。执行、冲突、恢复和归档 Work 需要完整证据时，以该 Work 的显式合同为准。

## 事务与归属隔离

启动正式写入前检查原网关未闭合事务与写集。属于本任务的事务按原恢复协议处理；属于其他任务的事务不得接管、解锁、清空或覆盖。只暂停资源重叠的写入与依赖分支，继续独立、已授权工作；事务年龄不构成接管授权。写后按变更 ID 定位受影响的索引项并回读目标原文，不为核验默认整读整库。

</activation-and-memory>

<ref-w-wayfinder-references-initiative-discovery>

# Initiative：从大需求到独立 Change

## 结构与所有权

探索载体是现有 change 目录；W 在其中拥有 `specdev/changes/{change}/initiative.json` 与 wayfinder 地图/调查票。`specdev/changes/{change}/initiative.json` 只记录候选边界、关系和 materialized target，不缓存子 change 的状态、Spec、设计树或票正文。

候选 `id` 是稳定 kebab 标识，`target` 为 null 或实际 sibling change 名；同一个 target 不能重复，也不能指向探索载体本身或父 implementation change。其他任务的现存 change 只能在核验归属并获得明确关联授权后引用，不接管其工作。

## 探索顺序

1. 命名大目标、用户指定数量和排除项；按行为、领域边界、风险、接口与发布独立性广度扫描。
2. 能描述边界的部分成为候选 change；不能描述的留在迷雾。候选至少写背景、目标、非目标和未知项，不预造实施步骤。
3. 在探索地图建立共享调查问题；每个问题仍遵循 research/prototype/grilling/task、HITL/AFK 和每会话一个调查票的原纪律。
4. 用户接受候选边界后，创建或明确关联 target change。共享答案以 solution comment/source 引用导入，不复制成新的永久知识。
5. 对每个 target 调用 “设计访谈能力”；该 target 独立拥有 design-tree、LOG、CONTEXT、ADR。已确认共享决定可引用复用，不能要求用户机械回答同一问题。
6. 单个 target 的关键决定清晰后分别进入 S/T；无关 target 继续探索。一个 target 的 blocker 不应阻塞其独立 sibling。

## 校验与交接门禁

- 候选 DAG 无环，依赖 ID 存在；目标与来源有证据，未创建 target 的候选不宣称 Ready。
- `--stage wayfinder` 验证 initiative 结构、目标存在性与禁止自引用；它不等于子 change 已就绪。
- 交接时对**选定** target 分别执行 `--stage grill` 与 `--stage tickets --repo <project-root>`，检查设计树 consensus、Spec `ready_for_tickets`、所有待执行票 Ready。
- 选定范围的跨 change 依赖须同时选择或有已完成基线证据，不用未完成/已取消票虚假满足依赖。
- 一个 target 交给 P 的单 change 分支；两个或以上 Ready target 交给 P 的多 change 分支。P 不接手剩余迷雾，也不为这些未知部分伪造计划。
- 用户明确要求全部 change 时，报告全部候选与各自阻塞；交接已清晰部分不等于少交付其他部分或宣布整个大需求完成。

## 版本与恢复

变更候选边界或依赖时递增 `revision`，在探索 LOG 记录来源和替代关系。原 claim、评论编号和低分辨率地图仍是原协议；不改写其他任务，不把探索载体迁成父实现 change。两者可以关联，但职责和 owner 分开。

</ref-w-wayfinder-references-initiative-discovery>

<ref-w-wayfinder-references-map-traversal>

# 寻路


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
- assignment registry：`specdev/changes/{change}/.status.json` 的 `claimed_investigations`

每次绘制或遍历前加载 下方 `<local-tracker-contract>` 标签。Ticket 和地图模板：

- 下方 `<investigation-ticket-template>` 标签
- 下方 `<wayfinder-map-template>` 标签
- 下方 `<solution-comment-template>` 标签

## Ticket 类型

每个 Ticket 要么是 **HITL**，与一个代表自己发言的人类一起工作；要么是 **AFK**，由 Agent 独立驱动。HITL Ticket 只能通过实时交流解决，Agent 绝不代替人类一方发言。

- **Research（AFK）**：阅读文档、第三方 API 或知识库等资源，揭示某个决策等待的事实。调用 下方 `<research>` 标签。当需要当前工作目录之外的知识时使用。
- **Prototype（HITL）**：调用 “原型阶段” 检测项目 UI、比较功能风格候选并逐步确认设计方向，把 `specdev/changes/{change}/prototypes/{design-id}/design-system.md` 与 comparison locator 链接为 solution comment 资产；`{design-id}` 使用 P 返回的 `UI-NNN`，P 不实现目的地。
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

路由前使用 Speculo Node 校验器 的 `--stage wayfinder`；Ticket、claim、comment 或地图不一致时保持 blocked。

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

</ref-w-wayfinder-references-map-traversal>

<ref-w-wayfinder-references-initiative-template>

```json
{
  "schema_version": 1,
  "artifact": "initiative",
  "change": "<YYYY-MM-DD-initiative>",
  "revision": 1,
  "destination": "<大需求目标>",
  "changes": []
}
```

</ref-w-wayfinder-references-initiative-template>

<ref-common-schemas-initiative-schema>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:speculo:specdev:initiative:v1",
  "type": "object",
  "required": [
    "schema_version",
    "artifact",
    "change",
    "revision",
    "destination",
    "changes"
  ],
  "properties": {
    "schema_version": {
      "const": 1
    },
    "artifact": {
      "const": "initiative"
    },
    "change": {
      "type": "string",
      "minLength": 1
    },
    "revision": {
      "type": "integer",
      "minimum": 1
    },
    "destination": {
      "type": "string",
      "minLength": 1
    },
    "changes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "id",
          "name",
          "background",
          "scope",
          "non_goals",
          "unknowns",
          "depends_on",
          "target"
        ],
        "properties": {
          "id": {
            "type": "string",
            "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
          },
          "name": {
            "type": "string",
            "minLength": 1
          },
          "background": {
            "type": "string",
            "minLength": 1
          },
          "scope": {
            "type": "string",
            "minLength": 1
          },
          "non_goals": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "unknowns": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "depends_on": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "uniqueItems": true
          },
          "target": {
            "type": [
              "string",
              "null"
            ]
          }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

</ref-common-schemas-initiative-schema>
