# 状态标签映射

本文件把 SpecDev 的标准角色映射到外部 Issue/项目管理系统的具体标签。标准角色保持稳定；具体标签字符串可以按项目调整。

## 1. 标准角色

| 标准角色 | 默认标签 | 使用条件 | 退出条件 |
|---|---|---|---|
| needs-triage | needs-triage | 外部请求尚未完成分类、影响和路由 | `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>` 已完成 |
| needs-info | needs-info | 缺少必须由用户或外部系统提供的信息 | 决策或输入已写入权威工件 |
| ready-for-agent | ready-for-agent | 当前工件满足 Ready 门禁，可由 Agent 自主继续 | Agent 领取、出现 blocker/deviation 或完成 |
| ready-for-human | ready-for-human | 等待产品、架构、安全、发布或不可逆操作批准 | 指定批准人记录决定 |
| wontfix | wontfix | 用户或 owner 明确决定不处理 | 通常为终态；恢复需新决定 |

标签是外部系统投影，不替代 `<Path>{roots.state}/specdev/status.json</Path>`、`<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 或 Ticket frontmatter。

## 2. 推荐流转

```text
needs-triage
   ├─→ needs-info ──→ needs-triage
   ├─→ ready-for-human ──→ ready-for-agent
   ├─→ ready-for-agent ──→ in-progress / review / completed
   └─→ wontfix
```

外部系统没有 `in-progress`、`review` 或 `completed` 标签时，可以不映射；SpecDev 内部状态仍由状态工件维护。

## 3. 内部状态投影

| SpecDev 状态或条件 | 推荐标准角色 |
|---|---|
| 新摄入、尚未分诊 | needs-triage |
| `blocked` 且缺少用户输入 | needs-info |
| Ready Ticket 或获批 Direct Spec | ready-for-agent |
| Deep Ticket 批准点、release deviation、不可逆操作 | ready-for-human |
| 明确取消且不再处理 | wontfix |

不得仅因添加 `ready-for-agent` 标签就绕过 Spec、Ticket、Goal Plan 或验证门禁。

## 4. 自定义规则

1. 可以修改“默认标签”字符串，但不得改变五个标准角色的语义。
2. 一个具体标签不得同时映射到多个互斥角色。
3. 项目没有对应外部系统时，保留本文件作为语义字典，不强制创建标签。
4. 标签不存在时先报告，不自动创建、重命名或删除外部标签，除非用户授权。
5. 外部标签与内部状态冲突时，以 SpecDev 权威工件为准，修正投影并记录原因。
6. 自定义结果应记录来源、系统名称、更新时间和维护 owner。

## 5. 项目映射

- **外部系统：** 无 / GitHub / GitLab / Jira / 其他
- **映射更新时间：**
- **维护 owner：**
- **自定义映射：** 无 / ...
