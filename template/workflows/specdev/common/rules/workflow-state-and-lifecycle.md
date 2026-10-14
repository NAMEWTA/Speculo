# 工件生命周期与恢复

创建、恢复、结束或归档 change 时读取。安装与业务运行分开；新项目不预造空目录、全局状态或工作调用记录。

## 身份与位置

change 的稳定身份是同一项目、领域内的 `YYYY-MM-DD-topic[-NN]` 目录名，日期为创建日期，不随归档重命名。真实首次创建时选择未占用名称；检查 active、新 archive 和旧历史，重名或多位置阻塞。只有需要相应内容时才建目录。

- 活动/已结束未归档对象：<Path>{roots.state}/specdev/changes/{change}/README.md</Path>。
- 新封存对象：<Path>{roots.state}/specdev/changes/archive/{change}/README.md</Path>。
- 既有历史：<Path>{roots.state}/specdev/archive/YYYY-MM/{change}/</Path>，原位只读，保留原 schema、许可、模式和字节。
- 直接 A 无 change 的必要维护回执：<Path>{roots.state}/specdev/maintenance/{date}-{topic}[-NN].md</Path>，只在跨会话/跨对象恢复需要时创建。
- 工程 docs：<Path>{roots.state}/docs/README.md</Path>，明确请求基线后按需存在；它是跨领域工程事实，不是 SpecDev 独占知识 store。

归档实际位置和原回执表示封存；不在 README 增加 archived、archive_path 或全局 active/archived 列表。新 archive 不嵌套月份。旧历史移动须另有明确计划，验证所有 locator 和 DESIGN 摘要；不可变正文不做路径替换。

## 唯一整体结论

每个新 change README 正文恰有一行：

```text
Outcome: active
```

合法值只有 `active | completed | cancelled`，ASCII 大小写和格式固定；不从标题、YAML、清单、代码围栏或时间推断。重复/缺失/非法 Outcome、同义 YAML status 或新旧混合权威均拒绝写入。README 保存目的、当前接续和验收导航；完成/取消必须先通过 <Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>，结论文本本身不是证据。

简单任务清单、范围、AC 和验证在 README；无独立 Ticket 的 Goal 用 goal-plan 清单；有 Ticket 则票和对应 Evidence 负责进度。迁出进度的位置改成导航，不能双写。复杂 Spec、Ticket、Map、Goal、Implementation、DESIGN 与专用工具合同保留真实消费者需要的字段。

## owner 与独有事实

不默认创建 leadership epoch、空批准槽或每 Work 记录。实际交接、并行、worktree/集成发生时，在原计划、Ticket Evidence 或操作回执记录唯一负责者、获批写集、输入、真实交接与下一步。复杂任务 owner 从原 implementation-plan/goal-plan 的 `lead` 读取。无 Goal 且动作确需 owner 时，README 的 `## Ownership` 内保存 `Owner: <session locator>` 与 `Evidence: <对象内相对路径>[#anchor]`，证据指向实际会话/交接；设计 bootstrap 还保存 `Work: specdev/prototype` 且依据正文绑定该 Work。普通只读不预建所有权记录，字段不创造授权。

每个实现 Ticket 的 Evidence 在 `## Workspace Execution Record` 下以唯一 JSON object 保留实际执行记录（原 worktree 字段），不创建全局 array 镜像；其中保留 base SHA、父分支、workspace/implementation/integration owner、workspace locator、implementation/source checkpoint、candidate/result SHA、验证与 E2E disposition。current 使用 current/direct-parent；required 使用 source/parent-candidate，清理后也保留集成证据。父计划只导航，不另复制一套结果。

语言、用户工具和数量来自当前请求/既有项目说明；实际并发、worktree 与尝试上限由原 Goal/项目约定负责，原 Goal/Implementation Plan 的 `## Execution Policy Source` 说明实际策略来源；已有 config 仍校验相应上限，Lead 自己实现计入并发。旧 config 的真实远程/验证用途可选保留；未知独有字段不能以简化为由丢弃。默认 UI 3 个、配置 2–4、明确用户数量覆盖，均不变。

## 创建、恢复和历史边界

首次真实任务才创建 README 和实际需要的其他工件。简单形态参考 <Path>{roots.workflows}/specdev/specdev-i-init-setup/assets/change-readme-template.md</Path>；实际需要 owner、验证或取消记录时读取 <Path>{roots.workflows}/specdev/specdev-i-init-setup/references/change-record-examples.md</Path>，不预填空槽。默认目录发现只枚举 changes 直接子目录，不递归把 ticket、archive 或临时目录当 change。指定历史再查询新 archive/旧月份 archive；同身份多位置报冲突。

恢复重读原 owner、输入摘要、实际 writer、Git/工具结果与未决动作。结果未保存不等于操作没发生；超时不证明 writer 结束。仅使受影响证据失效，不清零尝试、不抢锁，不改完成历史。review-only、performance、documentation、evidence-triage 留原报告或 Evidence，不能伪造问题已解决。

新 writer 不新增或更新旧 status 镜像。发现旧活动 status、未知 schema、混合协议或 <Path>{roots.state}/specdev/.markdown-conversion-pending</Path> 时只读盘点，停止重叠写入并交显式转换 owner；不自动升级、不因 README 存在跳过。pending 不证明互斥，也不能按年龄删除。旧 archive 原位冻结，历史 reader 不产生可写新对象。

CLI 刷新先 staging/验证再原子替换并保全未知 runtime；Work 不修改 <Path>{roots.state}/back/</Path>、安装元数据或命令 sidecar。安装故障只在与本次路径冲突时阻塞相关动作。
