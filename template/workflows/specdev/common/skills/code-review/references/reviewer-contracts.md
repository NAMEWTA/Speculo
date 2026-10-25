# 独立双轴审查

## 派遣与身份

默认派遣一位未参与当前审查范围实现的原生 subagent，分别给出标准轴和规范轴结果。实际需要并行时可派遣两位。沿调用方确定的 review 阶段方式执行：明确选择 Herdr/Orca/CLI 时用该工具派遣，并保存真实工具返回的 Agent/会话标识；编排方式与工作区独立。

实现者包括当前范围的代码、配置、模型可见指令及修复/冲突解决的所有 Agent。实现者运行测试和自查是实现活动，不能作为独立审查。改名、切换角色或重置上下文不改变参与过实现这一事实。Reviewer 只读审查对象，返回 findings；参与修复后必须另派独立 reviewer。

无法获得独立 Agent、身份无法核实或指定工具不可用时，报告 blocked/unverified，保持完成门关闭。不得用当前实现者顺序扮演两个角色替代派遣。task 上下文只执行分配的一个或两个轴，不递归编排；Lead 核对工具事实并维护正式 Evidence。

## 标准轴

依据固定 diff/log 或完整工作副本/文件快照、仓库标准和 Fowler baseline，检查正确性、可维护性及适用风险。引用来源与代码块，区分 hard violation 和 heuristic，跳过工具链已强制执行的纯格式项。

审查既有功能时按 <Path>{roots.references}/change-scope/change-contract.md</Path> 追踪相关调用方、依赖和测试，核对遗漏的消费者与验证范围。diff/working-tree 审查对照可用的原影响分析与实际修改；缺少分析时按已知目标和当前代码重建影响范围并说明限制。只有文件快照时按可见关系判断风险，不推断历史改动或宣称已验证修改范围。

## 规范轴

依据同一固定代码输入和实际规范，检查缺失或不完整需求、超范围行为、失败与边界语义；引用具体 AC、合同或决定。

有变更基线时检查修改是否服务获批目标，必要前置重构是否有具体理由、范围与验证，是否夹带无关清理；明确获批的重构按其真实目标验收。影响清单中的文件不自动获得修改权限，预测与实际不同本身不构成越权，仍以原范围和路径合同判断。

## 结果

同一 reviewer 可以读取两轴依据，但必须分别判断并按 standards、specification 顺序返回，不用一轴结论替代另一轴。两位 reviewer 时分别派发所属轴，汇总前不共享 findings。汇总者只整理格式，不删除或跨轴合并、重排发现，不设置任意字数或 finding 上限。

每轴返回 `pass | request-changes | skipped`。标准轴不可跳过；C 经来源发现确认没有规范时可 `skipped:no-spec`，不能宣称完整双轴通过。I 始终有 Spec/Ticket 或轻量 README 合同，两轴必须 pass。

执行与复用都按 <Path>{roots.workflows}/specdev/common/skills/code-review/references/review-evidence.md</Path> 保存独立性和固定输入证据。
