# 主题整合与冷归档

`C-consolidate` 接受用户选定的 active 或 closed、尚未冷归档的 Change；已冷归档树保持不可变，只能先由用户显式恢复后再参与。C 先输出包含源 ID、当前/旧 locator、时间、哈希、关系、冲突和目标 topic 的 dry-run，用户确认后在锁内移动整个目录到 `children/<child-id>/`。这是可恢复的多文件事务；目录 rename 不代表全部状态已提交。不得选择祖先与后代形成循环，也不得拆开已有综合子树。

## 迁移与恢复

先按稳定 ID 创建并登记目标 consolidation Change；该创建沿当前 Work 授权执行。迁移工具的 dry-run 本身不写任何文件：

```bash
node <Path>{roots.workflows}/learning/common/tools/relocate-learning.mjs</Path> --state-root <Path>{roots.state}/learning</Path> --parent <parent-id> --source <source-id>
```

向用户呈现返回的移动范围与 plan_digest。确认后对同一输入执行 `--apply --expect-digest <plan_digest>`。输入发生变化必须重新 dry-run 和核对已授权范围；不得用新摘要冒充已确认的计划。

工具在任何移动前写 `transactions/relocation/<transaction-id>/manifest.json`，保存全体源树文件哈希、全部受影响元数据的精确前后字节、路径映射和锁 owner token。锁按确定顺序取得：全局 `.consolidate.lock`，然后 `locks/<root-change-id>.lock`。子 Work 必须使用其当前 root_change 的同一个根锁命名，不在子目录自立锁；其他 Work 不持有迁移工具的事务 owner token。

前进操作更新所有后代的 global entry、locations/current/history、子状态、父子登记与 root_change。原始 Markdown 和未知文件字节不变。内容哈希及 effective_at 保存搬入前的来源快照；不能冒充之后持续变化的实时内容证明。

进程中断后，只以原清单恢复，不重新猜测移动来源：

```bash
node <Path>{roots.workflows}/learning/common/tools/relocate-learning.mjs</Path> --state-root <Path>{roots.state}/learning</Path> --resume <manifest-path>
node <Path>{roots.workflows}/learning/common/tools/relocate-learning.mjs</Path> --state-root <Path>{roots.state}/learning</Path> --rollback <manifest-path>
```

恢复先核对全部原文、目录成员及元数据只处于记录的前/后状态；有外来修改时阻塞并保留现场。只有本事务、同一 owner token、同一主机且已退出进程的锁可被恢复工具接管；不删除他人的锁。重复 resume 已完成事务时，必须验证全部 after 字节、目标位置及无未完成 staging；重复 rollback 已回滚事务时，必须验证全部 before 字节、原位置及无未完成 staging，才是已验证的无操作。终态与实际方向不符时拒绝且保留原清单和现场，不用另一方向的完整有效状态冒充完成。已回滚/已中止事务必须重新制定计划。自动回滚失败时报告清单路径和阻塞原因，不声称恢复成功。

## 综合、发布与冷归档

综合 claim 必须带 source Change、Lesson/Homework anchor、外部 source_id、evidence status（draft|supported|contested|unresolved）和验证时间，按 <Path>{roots.workflows}/learning/common/rules/evidence-integrity.md</Path> 校验真实引用。C 只有在第二次确认后才更新 topic context，同时写来源清单指针；迁移确认不代替发布确认。子来源 effective date 是该选中子树原 updated_at 的最大值；原始时间保存在恢复清单和源历史中。

A 只接受用户 close/confirm，在没有活动子树和根锁后把整个树移动到 `archive/YYYY-MM/<root-change>`；不检查作业或掌握，不做综合。A 的归档继续按本领域原关闭合同执行，不借用 C 的迁移命令创建新综合或改写历史。
