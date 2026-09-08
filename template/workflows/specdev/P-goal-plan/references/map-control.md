# 从 tickets-map 控制整个 Goal

## 只读控制器

使用 `<Path>{roots.workflows}/specdev/common/tools/ticket-control.mjs</Path>`，输入单 change tickets-map、父入口 tickets-map 或旧 Implementation Map。`--repo` 指项目根；可用 `--previous` 提供上轮 JSON 输出，比较输入漂移。输出仅建议 frontier、blocked、in-flight、完成票与受影响闭包，不写状态、不调用 Skill、不授予权限，也不代替既有阶段校验器。

```bash
node <Path>{roots.workflows}/specdev/common/tools/ticket-control.mjs</Path> --map <map-path> --repo <project-root>
```

Lead 将输出保存到调用方自己的既有 Evidence 位置；不创建独立调度数据库。JSON 中 `input_digest`、`goal_contract_digest` 和逐票 `contract_digests` 是读集快照，不是授权凭据。

## 每轮循环

1. 重读当前 map、Ticket frontmatter、Gate 与 owner；机器检查依赖、Skill、语义资源和路径，Lead 核验真实授权及当前 Git 事实。
2. 只有依赖成功满足、ready、owner 可判定且无冲突的票才能进入 dispatch。cancelled 不是成功交付：下游必须重规划依赖，不能自动视为 satisfied。
3. current 策略串行；required 仅在 config/宿主允许且写集、语义资源、integration queue 无冲突时并行。不同文件可能共享 API、数据表、锁文件或公共契约，因此不能只比较文件名。
4. 按票的调用阶段读取并实际执行必需 Skill；按项目协议调用的“技能”可以是宿主技能调用，也可以是完整执行该 SKILL 的程序步骤，但必须记录对应步骤/工具轨迹与输出，不得仅记录阅读完成。
5. I 返回后核对实现、Skill 执行记录、验证矩阵、实际交付数量和集成证据。失败保留 blocker；不能用减少测试或替换工具来“修好”状态。
6. 同步 Ticket 权威状态，再生成 map 投影与检查点。已完成票不重跑副作用；持久化失败不推进 done。
7. 有他人资源/事务冲突只暂停该票与其依赖闭包，继续独立、已授权票。无法可靠分辨共享资源时，暂停相关资源而非抢占。
8. frontier 空且仍有未完成票时返回精确缺口；全部票完成后执行 Goal 集成验收，按原完成合同关闭。

## 正式记忆

开始任何正式写入前，先检查原网关的 pending transaction、lock、recovery evidence 与 owner。Goal 只请求拥有 namespace 的原工作流执行，不直接写永久记忆，也不创建“更轻量”的旁路网关。

单票 blocked/deviated 不强制将父 Plan 的全局执行门关闭。只有全局合同失败或合法 frontier 为空时暂停父循环。检查点摘要覆盖 Spec、票合同、实际 Skill/参考版本、依赖、相关 serialization 与共享 Goal 门禁；普通 owner/status 和进度投影不是合同变更。摘要是漂移检测，不替代授权和实证验收。
