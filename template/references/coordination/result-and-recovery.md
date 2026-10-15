# 返回、验收与恢复

接收任务结果或恢复中断的 Goal 时读取。Lead 继续拥有原业务状态、Evidence、候选集成、整体 E2E Gate 与最终回复。

## 接收

1. 从实际存在的原 Goal、Ticket Evidence、Direct Spec Evidence 或当前审查输入找到任务、实际 Work、工作区、基线、owner 和工具 locator；缺 Goal/Ticket 不要求补造。返回必须对应同一目标；过时结果保留为历史材料，不能覆盖当前决定。
2. 通过当前工具指南核对任务是否确实返回，以及是否仍可能继续写入。已接收、已开始、会话空闲、任务结束、进程退出和业务通过分别记录；结果不明先查询，不重复发起任务。
3. 检查实际文件和 Git 事实：基线、可达 checkpoint、tip、dirty 状态、tracked/untracked/ignored 变更以及允许路径。返回文本不能替代真实候选。
4. 按原验收合同核对检查及输出。执行者修改测试、配置或验收脚本时，判断是否改变了通过标准，不接受伪绿色结果。自报、模拟、截图和推断在 Lead 核实前保持未验证。
5. review/research/test-observation 的 findings、来源及命令观察由 Lead 核对后写入原工件。独立审查 required 时，审查者必须满足原 Gate；同一实现者换名称或清空会话不构成独立。Lead 自审明确标识。

## 修复与集成

同范围 finding 有明确修复路径时，继续原 Ticket 的修复和复验，不逐个要求用户确认、不为每个 finding 新建 Ticket。current 由 Lead 在原 workspace 核验；required 使用原 source/candidate 集成合同。父分支推进、commit 和外部动作继续核对原授权。

达到原 integration_attempt_limit 或重复相同 blocker 时，在现有 Evidence 记录共同失败模式、最可能原因、下一轮具体改变、下一 owner/路由。只有有实质变化和新证据才开始下一尝试。更换执行者、清空 attempts 或再次询问相同问题不构成变化。

## 中断恢复

- 按输入分支读取实际存在的 Goal Plan、Ticket/Map 或 Direct Spec、README Outcome、最近 Evidence 和实际候选，核对当前 HEAD、输入与真实 Work 是否漂移。
- 使用记录的工具 locator 查询原任务，不根据缺日志推断没有执行。
- 仍可能写入或副作用结果未知时，不让 Lead 或另一执行者抢写；按当前工具指南检查、等待或在原授权下取消。
- 当前会话不具备查询能力时，说明缺失事实和恢复入口，不伪造停止证明。
- 用户改变后续偏好时在下一安全阶段采用；撤销权限立即停止新动作并处理进行中的任务。
- 独立且已授权的其他 frontier 可以继续；仅阻塞冲突任务及其依赖闭包。

## 外部网页 ZIP 返回

external-web 继续从不可覆盖的项目内 outbound ZIP 开始，保存唯一 inbound attempt、原始响应和 return ZIP。按 <Path>{roots.references}/coordination/exchange/source-package.md</Path> 核对 locator、SHA-256 和 manifest。

在新目录检查归档路径穿越、绝对路径、符号链接、重复/大小写冲突、异常膨胀和嵌套归档；不直接解压到工作区，不直接执行返回脚本。将候选与预期 checkpoint 比较，Lead 在选定 workspace 应用获准变更并完成本地验证。输入或授权改变时建立新的交付说明和包；旧附件不自动覆盖或清理。

## 完成

每个 pass 必须有可回读事实，候选不能直接成为 Ticket done。Lead 更新原 Evidence 和正式状态后继续下一 Ready 任务，最终核对整个 Goal Gate。开发与验证的完成不自动获得提交、发布、部署或清理授权。
