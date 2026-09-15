# 失败、未知、文档补交与回退

所有运行保存 immutable plan.json、approval.json、execution.json、journal.jsonl 和目标 receipts。新代码/schema 会改变 engine_digest，旧未执行批准失效；不要先升级执行器再尝试用旧批准继续。

apply 不能执行第二次；resume 只跳过已有成功终态回执，对 started-without-terminal 保持 unknown，不盲目再调用。同一终态 failed 动作必须编制新恢复计划。目标锁被未知运行占用时，inspect-run 核对步骤与实际服务/数据，不能直接删锁继续。

控制端目录锁可以使用 recover-controller-lock，但要求显式确认并证明记录 PID 已结束；目标 active-call 或 started-only 不提供假定成功的“强制修复”快捷键。必须由管理员检查进程、服务与具体副作用，再在保留原证据的前提下实施对应恢复。原 unknown 记录不应被擦除。

远端写文件失败产生终态 failed 回执；docs-sync 能恢复传输中断但目标已有成功回执的文档写入。对于真实终态文档写入失败（如权限/内容漂移），修复后用新的文档维护计划重新采集前置条件，不覆盖旧回执。docs-sync 不重跑任何业务动作。

回滚是一个新计划，可使用旧构件和旧 env 版本；原发布 run 保持不变。源码、镜像摘要、配置、默认版本、健康门和双边文档同样需要校验。数据库 schema/data 回退必须项目专用，不能仅换 image 或 service 就声称数据恢复。

迁移与接管需单独的 verified adoption。adopt_existing/allow_adopt_roots 只承认经过用户批准的既有目录，不意味未知数据库/凭据可被覆盖。写入前保留旧文件在 host_root/_host/runs/run-id/before/，但这些副本不是数据库一致性备份。

清理分两步：有限 cache/log 的同卷 quarantine；另一次批准后 purge-quarantine 精确 run/item。purge 是不可逆删除，只接受成功隔离证据和内容清单匹配，不能把数据、env、备份或 release 目录当成垃圾。
