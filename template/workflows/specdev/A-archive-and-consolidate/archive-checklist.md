# 归档检查

本清单由 `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/A-archive-and-consolidate.md</Path>` 使用。

- [ ] `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>` 内计划 Ticket 均为 `done` 或有批准理由的 `cancelled`。
- [ ] 每个 `done` Ticket 都有 `<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>`。
- [ ] `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` 的 AC/合同已覆盖，无未批准 deviation。
- [ ] `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>` 中适用 Gate 已关闭。
- [ ] 项目级验证通过，或已有明确接受的既有/环境失败记录。
- [ ] 迁移、兼容、监控、回滚和不可逆操作已完成或明确移交。
- [ ] `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`、Ticket、Evidence 和状态一致。
- [ ] 校验器无 error。
- [ ] 永久知识候选均有来源、范围和实现证据。
- [ ] 敏感值扫描通过。
- [ ] 用户已授权归档及需要的移动、Git 或外部副作用。
