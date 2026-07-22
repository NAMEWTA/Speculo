# 路由规则

在 `triage.md` 已具备类别、验证结果、信息缺口与行为契约草案后，按**首匹配**（从上到下）选定恰好一条主推荐。可附一条备选。推荐后**停止**，等用户确认再加载对应 work 入口。

## 首匹配表

| # | 条件 | Recommended status | 主推荐 |
|---|------|--------------------|--------|
| 1 | 已实现，或用户确认拒绝 / wontfix | `wontfix` | `none` |
| 2 | 关键信息不足（无法写出可测 AC 或无法判断类别/复现） | `needs-info` | `none` |
| 3 | `bug`，可复现（confirmed），根因未知 | `ready-for-agent` 或 `needs-triage` | **诊断** |
| 4 | `bug`，AC 清晰，范围小，修复点/模块清楚 | `ready-for-agent` | **实现** |
| 5 | `enhancement`，设计未定或接口仍开放 | `needs-triage` 或 `ready-for-human` | **设计访谈** |
| 6 | `enhancement`，设计已定，足以写 PRD | `ready-for-agent` | **编写 Spec** |
| 7 | 工作超单会话、通往目标的路径仍在迷雾中 | `needs-triage` | **寻路** |
| 8 | 以上皆非（默认） | `needs-triage` | **设计访谈** |

规则 1 的补充：用户确认拒绝 enhancement 时，可**提示**写入项目根 `.out-of-scope/<concept>.md`（格式见 `<Path>{roots.workflows}/specdev/common/triage/OUT-OF-SCOPE.md</Path>`）；默认不自动写。已实现关闭不写 `.out-of-scope/`。

规则 3 vs 4：「根因未知」= 知道坏在哪一类症状，但不知哪个模块/不变量失败；「修复点清楚」= 已能指出接口或模块级落点。

规则 7 可选：仅当用户或理解结论明确「多会话 / 战争迷雾」时命中；否则落入默认规则 8。

## 入口 Path

| 显示名 | Path |
|--------|------|
| 设计访谈 | `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>` |
| 编写 Spec | `<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>` |
| 实现 | `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>` |
| 诊断 | `<Path>{roots.workflows}/specdev/D-diagnose-bugs/D-diagnose-bugs.md</Path>` |
| 寻路 | `<Path>{roots.workflows}/specdev/W-wayfinder/W-wayfinder.md</Path>` |
| none | 字面 `none`（向用户提问或结束分诊） |

## 推荐话术

向用户展示时使用固定骨架：

```markdown
## 分诊结论

- **Change：** `{change}`
- **类别：** bug | enhancement
- **推荐 status：** …
- **主推荐：** <显示名> → <Path>…
- **理由：** <对应上表条件的一句话>
- **备选：** <可选>

产物：
- `<Path>{roots.state}/specdev/changes/{change}/source-issue.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`

是否进入主推荐 work？确认前我不会启动下游或修改项目代码。
```

`needs-info` 时：话术改为列出「信息缺口」中的具体问题，主推荐写 `none`，并说明补齐后可再次运行本 work 或直接指定下游。

`none` + `wontfix` 时：说明已实现位置或拒绝理由；询问是否需要记录到 `.out-of-scope/`（仅 enhancement 拒绝）。

## 停止规则

- 本步只推荐与展示；用户确认「进入 X」后再加载对应 Path，并移交 change 名、`triage.md` 路径与行为契约要点
- 用户选择备选或否决时，先更新 `triage.md` 推荐字段，再结束或按新选择移交

## 完成检查

- 从上到下只命中一条主推荐
- Path 使用上表别名格式（或 `none`）
- 用户已看到理由与确认问题
- 下游仍处于未启动状态
