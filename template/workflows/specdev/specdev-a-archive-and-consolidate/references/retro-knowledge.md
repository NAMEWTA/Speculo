# RETRO 永久知识写入网关

仅在 R 已形成具体沉淀方案且有覆盖 ADR/context 候选及写集的批准时进入。A 是知识 writer，R 保留原 PLAN/approval/execution 总回执；不创建 change，不运行实现完成门，也不自动归档。

1. 读取 R 的 <Path>{roots.workflows}/specdev/specdev-r-retro/references/records.md</Path>，按原 PLAN inputs 的报告/发现/证据核对当前项目事实；疑点沿会话锚点回读。按本 Work 的 [毕业标准](knowledge-graduation.md) 与 [合并规则](consolidation-rules.md) 核对适用价值、冲突和目标。
2. 只接受 root=state、target_kind=adr/context、owner=specdev/archive-and-consolidate 的明确目标。按 [operation contract](operation-contract.md) 检查同写集 pending/lock/recovery；不接管他人事务。原方案中列出需要变更的索引，不能为索引另开未批准写集。
3. 核对 PLAN/批准/候选摘要，保存 before-image。运行 R 校验器 apply 后，逐项原子写入并回读目标和索引。条目包含适用条件、真实来源 RETRO/F-ID/E-ID、判断依据及验证，不复制整个会话。
4. 将每个目标的 owner、落地摘要、实际验证命令/退出码或观察、原始输出证据返回 R，并保存在原方案 evidence/。R 据此追加 execution.results；已有成果只从真实回执恢复，不重复改写。
5. 全部计划内目标验证通过后 R 才能请求 [RETRO 归档](retro-archive.md)。部分失败保留已完成结果，未完成发现不能作为已处置归档。

本窄调用复用已覆盖该目标的批准；Skill 更新批准不能代替知识写入批准。路径/候选漂移只阻塞受影响写集，任何元数据不创造授权。
