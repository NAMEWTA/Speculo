# SpecDev 统一收尾操作合同

A 单一拥有本合同；Command 只路由领域入口，不作为通用知识执行器。默认 dry-run 返回会话计划、零文件写入；confirmed 仅执行真实具体批准覆盖的动作。

R 调用的 RETRO 归档沿 [RETRO 窄网关](retro-archive.md)，总决策/执行回执留在原升级方案，逐对象移动回执随对象保存；不创建 change 回执或触发以下四类维护。

## 输入、范围与唯一回执

输入是验证过的 WorkContext（projectRoot/methodRoot/stateRoot）、固定目标/主题清单、模式、批准来源和写集。未指定 change 时只读目录/README 候选消歧，不读旧全局索引决定新身份。独立知识审计/维护无需虚构 change。资料缺失或网关不明只阻塞依赖动作。归档没有候选返回 no-candidates；不创建访谈 change 或空回执。

| 调用 | 唯一总回执 | 创建与冻结 |
|---|---|---|
| Command 调 A | <Path>{roots.state}/commands/project-maintenance/{date}-{scope}-{topic}[-NN].md</Path> | Command 负责总报告，A 只返回逐项结果 |
| 直接 A、有 change | <Path>{roots.state}/specdev/changes/{change}/archive-receipt.md</Path> | confirmed 后创建，随目录移至 <Path>{roots.state}/specdev/changes/archive/{change}/archive-receipt.md</Path> |
| 直接 A、无 change | <Path>{roots.state}/specdev/maintenance/{date}-{topic}[-NN].md</Path> | 仅跨会话/跨对象/恢复需持久化时创建 |
| dry-run/只读审计 | 会话结果 | 不创建文件 |

新报告无覆盖创建；实际归档的导航、结果段和完整性清单按 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/archive-receipt-contract.md</Path>。恢复先核对原 owner、输入摘要、批准范围与已落地结果。原操作未结束时只补真实检查点，不能改原请求/验收/结论。所有检查完成并写完原回执才冻结；后续纠错写外部补充记录引用原件。DESIGN 用不可变批准快照绑定摘要，可变回执只引用它，不能因追加日志使批准失效。

## 计划

1. 归档按 <Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path> 验证 completed/cancelled 原证据、owner、实际 writer 和直接依赖；父子/远程门按实际存在读取。取消不是授权回滚或清理。独立维护只核对本主题事实与原 gateway。
2. 按 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/archive-rules.md</Path> 预检身份、源/目标、链接/模式及来源移动后可解析。batch 全部固定候选预检通过才执行，不扩大到新发现对象。
3. 对 change、ADR、context、当前 docs 四类逐项写结论，UI 再核对 DESIGN。按候选 ID/关键词定位相关知识与 provenance，不全库扫描。可选工件缺失说明后跳过；已知有关错误不得留到封存后。
4. 每项计划列源/目标、动作、依据、内容 owner、执行 owner、批准、before-image/输入摘要、结果与恢复点。知识依 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/knowledge-graduation.md</Path>、<Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/consolidation-rules.md</Path>；清理候选依 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/cleanup-rules.md</Path>。没有晋升候选合法，不凑数量。
5. 用 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/assets/archive-plan-template.md</Path> 承载计划和结果；有知识整合候选时再读 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/assets/consolidation-plan-template.md</Path>，有清理候选时再读 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/assets/cleanup-candidate-template.md</Path>。同一具体批准统一复用，新增副作用或漂移只重开受影响确认。

mechanical-only 复用仍有效的四类核对回执，或明确仅移动授权；必须报告未授权维护与已知相关错误。它免除重复知识读取，不允许把未知写成无需维护；必需维护未完成时移动阻塞。

## 执行顺序与检查点

| 步骤 | 动作与通过条件 |
|---|---|
| A0 | 重验原对象/结束证据/owner/依赖/相关事务锁；不接管他人任务 |
| A1 | 固定四类资产及适用 DESIGN 计划、源目标和候选范围 |
| A2 | 核对授权、来源摘要、before-image 与实际写入者；保存可恢复原件 |
| A3 | 执行获批现役 docs/ADR/context 维护，每项写后回读；docs 使用共享 current-facts-docs 方法 |
| A4 | 必要 DESIGN 通过专用网关发布，记录 candidate、expected current、批准与三类摘要及真实工具检查点 |
| A5 | 核验当前资产、链接和完整/部分替代承接，执行已批准清理，预检移动后 locator |
| A6 | 最后整体无覆盖移动 change，重验源字节、目标空缺、同文件系统与单写入者/隔离 |
| A7 | 原回执 Result=moved；从唯一目标以 archived 验证清单、字节、模式、链接、DESIGN 来源/批准/原型和实际消费者，源不存在；此时未封存 |
| A8 | 完成原总报告/回执，Result=verified 且 archived --sealed 通过后宣布封存；否则 partial/blocked 并保留精确恢复点 |

A3–A5 任一本次必需动作未完成则不移动。DESIGN 仅用 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/design-knowledge-gateway.md</Path>，不能通用 append/merge current 或 revision。research/非标准 store 仍归原声明，不从目录名取得权力。A/I 不写 project-maintenance state/sidecar、不推进 commit 基线。

## 中断与恢复

普通收尾没有多文件整体原子性。已维护知识或设计发布成功而移动失败，保留已发布事实，按原回执继续；不得自动回滚规范。移动已发生则从目标恢复，只补原操作验证/回执，不再次移动。DESIGN 以 revision/current/INDEX 与原 operation 的真实状态续作，不跳号、覆盖或重复发布；锁按专用原 owner 协议处理，不按年龄清除。

结果不明先检查真实系统，报告缺失不证明动作未发生。跨文件系统失败不降级复制删除；另迁移须独立授权与保真计划。恢复有冲突保留原件，停止重叠写集及依赖，独立已授权工作继续。只有本次获批范围的全部动作和检查有结论才 `verified`。
