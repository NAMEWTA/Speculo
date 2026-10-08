# Intake Protocol

仅在 Triage `mode=intake` 时加载。本协议把外部输入转换为不可静默覆盖的本地来源快照。默认不回写源 Issue 标签；显式要求的标签更新按远程协议单独授权、记录并重读。

## 1. 解析来源

按以下优先级确定 `source_type`：GitHub Issue/PR URL、普通 URL、项目相对文件、用户粘贴内容、当前对话。来源为 GitHub 时调用 `<Path>{roots.workflows}/specdev/T-triage/remote-operations.md</Path>` 的 `issue-read` 或 `pr-read`；其他 URL 使用当前环境可用的只读读取能力。读取失败时保持 blocked，并请求用户提供导出或粘贴内容。

只记录规范化 URL、项目相对 Path 或 null；不保存机器绝对路径、认证信息、Cookie 或令牌。

## 2. 查重与漂移

在 active 和 archive 的 `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>` 或对应归档 Source 中查询相同 `canonical_locator`：

- locator 与 hash 相同：恢复已有 change，不创建副本；
- locator 相同但 hash 不同：展示漂移，不覆盖原快照；仍属当前活动 change 的请求写入 sources/SRC-###.md，supersedes_source 指向前一快照，并更新 triage.source 指向有效版本。已完成/归档或目标范围改变时创建新 change，引用原来源；不重开归档原件；
- 没有稳定 locator：按用户指定 change 或新 change 继续。

若 `<Path>{roots.state}/specdev/capture.md</Path>` 存在，且某行 `url` 或 marker 对应当前 `canonical_locator`：将该行标为 `intaken`。不得把多条 capture 行合并进同一个 source。默认一条 capture 记录对应一次未来 intake / 一个 Change。相关但目标不清时先走 `<Path>{roots.workflows}/specdev/W-wayfinder/W-wayfinder.md</Path>`。缺失捕获账本不影响 intake。

同时只读扫描永久 ADR、archive 中已关闭的同类请求和当前 active change 标题。发现概念相似项时向用户展示路径与一句话理由，询问是否仍要继续。不自动 wontfix，不新建 `.out-of-scope/` 目录。

## 3. 冻结内容

GitHub 来源保存 title、body、author、state、labels、created/updated 和截至捕获时可见的全部评论。普通 URL 保存可读正文和元数据；项目文件保存内容及项目相对 Path；粘贴或对话保存用户原文。

在计算 SHA-256 前移除秘密、令牌、Cookie、个人隐私和不应长期保存的敏感日志，并在 Redactions 记录类型，不记录原值。附件默认只留 URL 与描述。

使用 `<Path>{roots.workflows}/specdev/T-triage/source-template.md</Path>` 写临时文件，重读并验证后原子替换目标。已有 `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>` 永不就地覆盖。

## 完成标准

- 来源类型、locator、捕获时间、hash 和关闭能力已确定；
- 完整可持久化正文与评论已冻结；
- 重复和漂移分支有唯一结果；
- 相似归档/ADR 项已展示或明确无匹配；
- 失败没有生成伪造或不完整的 Ready source；
- 未请求标签回写时无远程写入；已请求动作有独立授权与回执。


## 分诊与交接

来源冻结后，按命中条目读取永久 ADR/CONTEXT、当前 change 工件和代码事实；可选输入缺失不补造。使用 `<Path>{roots.workflows}/specdev/T-triage/references/classification-map.md</Path>` 分类为 bug、feature、refactor、investigation、operations、documentation、review 或 mixed。评估影响、紧急度、事故半径、安全、数据、迁移与人工批准，把未知项区分为可发现事实、待用户决定和低影响实现细节。

使用 `<Path>{roots.workflows}/specdev/T-triage/triage-template.md</Path>` 写入 `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`。按以下条件选择下一 Work，而不是要求每个请求经过全链：

| 条件 | 下一 Work |
|---|---|
| 根因未知的 bug | `<Path>{roots.workflows}/specdev/D-diagnose-bugs/D-diagnose-bugs.md</Path>` |
| 产品或架构高影响决定未锁定 | `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>` |
| 大需求的 change 边界或路线尚不清晰 | `<Path>{roots.workflows}/specdev/W-wayfinder/W-wayfinder.md</Path>` |
| 检测 UI、比较风格并固化设计包 | `<Path>{roots.workflows}/specdev/P-prototype/P-prototype.md</Path>` |
| 外部行为明确，需要验收合同 | `<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>` |
| 固定点 diff 或 PR 审查 | `<Path>{roots.workflows}/specdev/C-code-review/C-code-review.md</Path>` |
| 小型明确变更 | `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>`，或获批 Direct Spec |

只有目标、范围、验证、路径和风险全部明确且用户批准 Direct Spec，`ready_for_implementation` 才能为 true。相似的归档拒绝或 ADR 只作为决策证据，不自动 wontfix 或回写远程标签。

## v2 核验与快照演进

摄入时读取 <Path>{roots.workflows}/specdev/T-triage/references/issue-pr-policy.md</Path>。填写 disposition、verification、remote_actions；ready-for-agent 仅在 verification=passed 时使用，仍不代替 Ticket Ready。读取 PR 必须获得完整分页、reviews/review comments/diff、base/head SHA 和 fetched_at，缺失或漂移保持 blocked。

<Path>{roots.state}/specdev/changes/{change}/source.md</Path> 不覆盖；后续快照写 sources/SRC-###.md，明确 replaces 和有效版本，按 <Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path> 管理。活动 triage v1 只在用户选择该 T 分支后，以原始内容为证据补齐 v2 字段和验证；保留旧版本证据，不自动批量迁移。裸编号先查询对象类型；已有实现、重复、明确拒绝分别记录，已有 PR 输出剩余工作 brief。
