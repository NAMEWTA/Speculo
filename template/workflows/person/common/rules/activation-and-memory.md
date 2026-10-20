# Activation and memory retrieval protocol

本规则只在用户明确激活当前 workflow 或某个 Work 后读取。INDEX 只用于被动发现，不初始化状态、不读取 active change、不写入知识。

## Locate before read

1. 先解析当前 workflow 的 roots、状态索引和稳定 ID；不存在时静默跳过，不能凭旧路径猜测。
2. 根据当前请求、Work 分支、关键词、稳定 ID、状态和 provenance，先搜索相关索引行或目录项，再定位最小相关 entry；不把索引全文默认装入上下文。
3. 只回读命中的 entry 和直接 provenance；需要恢复、冲突裁决、归档、迁移或执行安全证明时，才读取该阶段声明的完整证据集合。
4. 没有匹配证据时返回缺失证据并停止依赖该结论的分支，不补造事实。

## Memory writes

正式知识、永久 context、synthesis 或 archive 写入前，先解析唯一 owner 与 gateway，检查 pending transaction、lock、未完成 promotion 和 recovery evidence。gateway 不明或事务未闭合时，只阻塞记忆写入，继续独立且已授权的审计、定位、验证和其他工作。

每次写入必须记录 source IDs、证据定位、验证时间或 digest；写入后定位受影响索引项并重新读取目标 entry，确认 owner、locator、内容和状态投影一致。原始证据不可被派生视图覆盖。

## Read budget

当前 Work 的权威状态、schema、Map/Plan、当前输入和直接所有权合同可以完整读取；非当前分支的知识树、历史 change、研究库、项目 Skill 和示例只按索引与关键词读取。执行、冲突、恢复和归档 Work 需要完整证据时，以该 Work 的显式合同为准。

## 事务与归属隔离

启动正式写入前检查原网关未闭合事务与写集。属于本任务的事务按原恢复协议处理；属于其他任务的事务不得接管、解锁、清空或覆盖。只暂停资源重叠的写入与依赖分支，继续独立、已授权工作；事务年龄不构成接管授权。写后按变更 ID 定位受影响的索引项并回读目标原文，不为核验默认整读整库。

## 跨领域编排与显式交接

用户明确要求委派、跨工具/模型协作，或本 Work 已要求独立协作者时，读取 <Path>{roots.references}/coordination/coordination-contract.md</Path>；编排可调用任意已选 workflow，实际产物和状态仍遵守本域 owner/gateway。项目默认方式由公共 command/coordination-init 显式初始化；普通激活不触发问答。

用户要求重要决策的独立复核，或高影响决策存在重大反证且宿主具备相应能力时，按需读取 <Path>{roots.workflows}/person/common/rules/independent-decision-review.md</Path>。原 Work 保持裁决与发布权；复核不增加默认咨询阶段或改写冻结 dossier。

只有用户明确要求 handoff 时读取 <Path>{roots.references}/handoff/handoff-contract.md</Path>。本域未归档 change 允许本次唯一交接作者更新 handoff.md 侧记；无 change 的资源模型使用共享方法定义的会话报告。它反映已有事实，不推进本域状态、完成门或永久知识。
