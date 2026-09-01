# Target Profile、发布 Gate 与数据保护

## 三层证据

I 拥有 `deployment/target-profile.json`，记录非敏感期望、现场身份和授权边界；P 拥有绑定 profile 摘要的 plan，记录候选、Gate、数据保护和恢复策略；E 在每个 attempt 中拥有 `verification-state.json`，记录实测身份、Gate、构件、探针、稳定窗口和恢复资产。Markdown 只投影这些结构化事实。

profile、plan 或 verification state 禁止保存 secret 值。只保存 key、provider/受控 locator、版本、是否必须存在和 presence 证据。需要生成私密配置时，输出必须位于 deployment root 或外部受控位置，权限和未回显证明进入 attempt；私密文件本身不得复制进 Ops state 或 HANDOFF。

## Operation Mode 与接管

- `audit`：只读盘点；不批准 mutation。
- `takeover`：已存在持久目录、控制面资源、数据、路由或服务时的默认模式；保持现场身份和命名。
- `fresh`：只在证据证明目标为空、归属清楚且 protected/unknown targets 为空时允许。
- `release`：向已确认目标发布不可变候选。
- `upgrade`：从已确认现役版本迁移到新候选。
- `rollback`：恢复已验证且兼容的目标或反向操作。

现场为 `present` 或 `unknown` 时不得选择 fresh。差异分类为 `ownership-conflict` 或 `unknown` 时 profile 必须 blocked；不得通过改用 global scope、改名或宽泛命令绕过。

## 控制面身份

身份由一组不可拆分 assertions 表示。每项声明 provider、key、`exact | ordered-list | set | digest` 比较、非敏感 expected 和 evidence。Compose 的 project、有序 files、env file、services、labels/image identity 和 bind host 应分别进入 assertions；目录名、容器名前缀或单一文件不能独立证明身份。

mutation 模式要求整体 `identity_confirmed=true` 和确认 evidence。E 在第一条 mutation 前重采集 actual 并逐 assertion 比较；任何漂移使 approval 失效并返回 I/P。

## 构件与提升

发布构件使用不可变 SHA-256 或 provider 的不可变 digest/image ID。适用时计划必须声明授权 root 下的独立 staging、activation target 和 previous ref；传输后在目标端重算摘要，再原子切换活动指针。未验证候选不得进入 active 位置，可变 tag 不构成不可变身份。

失败候选、previous release、rollback material 和脱敏日志默认保留。cleanup 不继承部署批准，只能由新的 plan batch 执行。

## 数据保护

每个 data mutation 映射到一个 `data_protection` 条目。默认策略为 verified backup：记录受控 evidence locator、摘要、可读性、restore ref 和恢复验证。production 不接受 waiver。

只有 local 环境且用户针对精确对象明确批准时允许 waiver；必须同时记录 decision locator、exact scope、对象身份确认、零冲突 preflight 和 `forward-only` 恢复边界。执行器事务能力未知、备份不可读或恢复路径未验证时，在第一条持久写入前停止。

## Gate 与验证

plan 的 required Gate 与 batch 形成组合 DAG：batch `gate_ids` 是启动该批次前必须 passed 的 Gate，可为空；Gate `after_batches` 是计算该 Gate 前必须完成的批次。E 只能在 batch 的全部 gate ids 已 passed 后开始该 batch；Gate failed/blocked 后不得执行新的 operation、提升活动指针或删除候选，后续 Gate只能标记 skipped。

每个 required verification id 必须由 Gate 引用并在 verification state 有唯一结果。HTTP 探针独立声明允许状态、允许业务码和认证要求；稳定窗口声明 interval、timeout 和连续成功数。瞬时失败可以记录，但连续成功不足或超时仍失败。多实例收敛通过显式 convergence group 比较不可变构件和运行配置摘要。

成功、回滚或作为 completed 依据的 abandoned attempt 必须生成 verification state 和无密钥 handoff，并证明 required Gates、数据保护、恢复资产和接受的残余风险。
