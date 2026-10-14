# SpecDev 活动数据的显式 Markdown 转换

此工具属于本仓库维护面，不是新增 Command/Skill，不随 `speculo init` 自动执行，也不是普通 Work 的前置条件。只有用户明确批准具体项目、完整活动对象范围、备份和写集后，转换 owner 才能使用 apply。计划文件和 `approved` 一类文本不产生授权；已覆盖同一计划的真实批准可复用。

## 支持范围

运行 Node.js 与本仓库依赖；先生成 runtime 并构建。读取 global status v5、change status v6、可选 config v7。严格校验未知字段/版本、真实日期、完整活动对象清单、安装身份和根。活动 claims、未退出 writer、未决 worktree 集成、安装或 DESIGN 锁阻塞转换。旧 `archive/YYYY-MM/...` 默认原位冻结，不重算摘要、不修正文中的历史路径。旧工具不支持新活动协议；必须停止并保持所有旧 writer 隔离，直到转换 owner 完成验证并释放。

配置原字节保留，仍仅供其真实工具消费者按需读取。源 `.status.json` 退役到各 change 的 `conversion/<id>-status.original.json`；全局原件进入 `specdev/conversion/`。README 承接唯一 Outcome、owner 和原事实导航；worktree 独有事实进入对应 Ticket Evidence 的 `Workspace Execution Record`。旧 JSON 原件只读，不能继续双写。completed 必须在快照上通过新完成验收，旧枚举本身不构成完成证明。无法证明的对象停止，不自动改成 active 或 cancelled。

## 固定与审阅计划

```bash
node scripts/migrate-specdev-markdown.mjs plan \
  --project-root /absolute/project \
  --state-root .agents/speculo/.speculo \
  --source-version exact-old-method-and-tool-version \
  --owner session:conversion-owner \
  --id reviewed-conversion-id > /approved/location/conversion-plan.json
```

`plan` 本身零写入；重定向位置由调用者选择。计划列出真实节点（包括空目录、模式、软链接、未知二进制）、Git tracked/untracked/ignored 清单、所有新增/替换/退出动作及输入摘要。没有 Git 时明确记录缺失，文件系统清单仍完整。确认范围覆盖该根全部旧活动对象和父子依赖；不以局部获批宣布整个根转换。

准备追加内容的既有 README 和 Ticket Evidence 必须是合法 UTF-8。plan 遇到非法或截断的编码时指出文件并停止，不替换字符、不猜测旧编码、不创建备份或 pending；由原 owner 明确处理编码后重新固定计划。合法 UTF-8 的 BOM、CRLF/LF、Unicode 原文和文件模式均保留，新增内容只追加在原字节之后。

`backup-root` 必须明确位于项目内、整个 stateRoot 之外，不能是 CLI-owned `.speculo/back`。建议使用项目相对路径，避免宿主 `/var` 等别名歧义。目录 `<backup-root>/<id>` 由该操作独占：保存计划、before、经过实际恢复副本核验的备份、staging、receipt。所有原始链接按链接类型保存；写集经过每层链接检查，不能借链接写出项目。

真实审批来源必须有 `Plan: <id>`、`Owner: <owner>`、`Input-SHA256: <plan.inputSha256>`、`Plan-SHA256: <conversionPlanDigest(plan)>` 四个字段；后者由工具导出的 `conversionPlanDigest` 计算，绑定完整写集和来源。它们证明记录对应本计划，不把记录自身变成授权。原来源内容在恢复时必须保持同一摘要。计划也绑定安装 identity 文件和实际转换/验证工具摘要，不能换工具版本后沿用旧快照验收。

## 应用和真实 writer 核对

原 writer 清单与交接必须有可回读来源，列出该主机上的全部原 PID；工具对每个 PID 调用实际进程存在性检查。存活、未知权限或其他主机均拒绝，单独 `stopped: true` 不足以通过。PID 检查不负责发现所有未知进程，不提供跨主机排他；转换 owner 仍须建立真实单写入者/离线隔离并保持它。

交接记录包含 `Host`、排序的逗号分隔 `PIDs`、`Writers: stopped` 和说明真实终止观察的 `Observed`。PID 被复用且仍活跃会保守拒绝；不存在 PID 仅证明当前未存活，不能单独证明历史身份或发现未盘点 writer，必须结合原交接和真实隔离。

```bash
node scripts/migrate-specdev-markdown.mjs apply \
  --plan /approved/location/conversion-plan.json --apply \
  --owner session:conversion-owner --backup-root conversion-backup \
  --writer-host actual-host-name --writer-pids 12345,12346 \
  --handoff-source evidence/writer-handoff.md \
  --approval-source evidence/conversion-approval.md
```

先重验计划、摘要、schema、事务和 writer；保护 before 并测试恢复；在 staging 生成新文件并验收，再无覆盖创建 `.markdown-conversion-pending`。随后按固定顺序写新工件、退出每个旧 change 状态，最后退出全局状态。每次动作有实际摘要核对和 receipt 检查点，写入使用同目录临时文件的原子发布。未知字节、历史和其他领域不在转换写集。

pending 仅绑定原 owner、转换 ID、计划/回执 locator 与输入摘要。它不是业务状态或互斥锁，不按年龄删除。实际并发还由独立短期进程锁保护。整树 bytes/type/mode/link 清单必须与预验证 staging 一致；原 owner 完成后清标记并重读新消费者，失败重新保留原标记与回执。

## 失败与恢复

重复 apply 或 `recover` 默认接续同一操作，核对原 owner、计划、备份、writer 和实际完整树，只允许原检查点或紧随其后的已落地单步；动作落地后、回执尚未落地的崩溃不会重复覆盖。活进程锁不接管；已证实退出的同主机进程可由原操作通过独立 resume guard 接续，未知锁保持。

普通 reader/writer 从不绕过 pending。原转换恢复只对保存的 before/staging 做直接只读检查，重验原安装/验证工具身份和每个实际文件；完成之前依然保持 pending。初次 staging 已运行全部存在的新工件消费者，completed 额外运行完整验收；恢复时必须是同一工具和同一输出清单，才能复用该验证证据。

```bash
node scripts/migrate-specdev-markdown.mjs recover \
  --plan /approved/location/conversion-plan.json --apply \
  --owner session:conversion-owner --backup-root conversion-backup \
  --writer-host actual-host-name --writer-pids 12345,12346 \
  --handoff-source evidence/writer-handoff.md \
  --approval-source evidence/conversion-approval.md
```

确需恢复原协议时，使用同样参数加 `--mode rollback`。只允许尚未完成、实际现场精确匹配本计划部分写集且备份未损坏的转换。恢复原文件、原模式和目录后核对原清单，再清自己的 pending。已完成转换、后续新业务事实或任何未知漂移均拒绝回填旧 JSON，应另做前向修复/保真逆向方案。

rollback 的每个文件恢复和新增目录清理也有检查点；恢复动作自身中断时只能继续 rollback，不切回 apply。任何新增业务事实使现场不再匹配原恢复前缀时仍停止，不能借恢复覆盖它。

准备或 staging 验收失败且 receipt 尚未产生时，业务源完全未改；保留操作目录以供审查，修正源/计划后使用新 ID 和新备份位置。工具不删除未知失败目录，不宣称全局回滚，不回滚远程/设计发布结果，不自动移动历史，也不自动刷新安装。

## 验证证据

`test/specdev-markdown-migration.test.ts` 使用一次性夹具覆盖 plan 零写入、完整清单、live PID、未知 schema/字段、输入漂移、已有备份、逐步中断/重试、备份损坏、部分 rollback、后续业务事实拒绝、未知字节/软链接/模式/历史以及转换后的两次真实安装刷新。它们证明工具效果，不代替真实用户批准或真实项目 writer 盘点。未对用户业务数据运行转换。
