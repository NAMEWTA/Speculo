# SpecDev 归档移动

只适用于 A 固定的当前协议候选，生命周期由 <Path>{roots.workflows}/specdev/common/rules/workflow-state-and-lifecycle.md</Path> 定义。不支持的旧协议拒绝进入本次移动，不改变其原件。

## 预检

- 名称合法且 active、新 archive、旧 archive 中只有一个身份；不从 mtime 猜日期或自动改名。
- 源是 <Path>{roots.state}/specdev/changes/{change}/</Path>，README Outcome 为 completed/cancelled，原 owner 的对应证据、父子和已承诺外部门已通过；不额外要求删除 branch/worktree。
- 目标 <Path>{roots.state}/specdev/changes/archive/{change}/</Path> 不存在；源、父目录与目标逐层真实路径、模式/链接均可保真，数据根和写集已获批。
- 四类资产及适用 DESIGN 已完成必要现役维护，移动后所有来源/批准/原型可解析；batch 的固定候选全部预检通过。

## 移动与封存

1. 最后重验具体批准、源清单/摘要和原回执；必要时才建 archive 父目录。
2. 使用宿主提供的无覆盖同文件系统移动，或可证明单写入者/隔离边界内的移动并重验。“先检查不存在再普通 rename”不证明并发无覆盖；无法保证时阻塞。跨文件系统不切换成复制删除。
3. 整体移动原 change，README Outcome 保持原 completed/cancelled，不增加归档状态、索引或 archive_path。批准/设计/研究/许可字节不改写。
4. 按 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/archive-receipt-contract.md</Path> 从目标回读原清单、字节、模式和链接；源消失、唯一目标存在，原结果记 moved，运行 archived 和适用引用/设计消费者验证。原回执仅可补本次真实检查点，此时未封存。
5. 完成原回执，结果记 verified 并通过 archived --sealed 后冻结。后续纠错写外部补充记录；未完成恢复仅原 owner/批准操作，不能借恢复编辑历史正文。

普通目录移动不使知识与整批变成原子事务。任何失败保留已落地事实，按 operation-contract 的检查点恢复，不覆盖目标、不重复发布、不虚构整体回滚。
