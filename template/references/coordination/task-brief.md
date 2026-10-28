# 通用任务简报

仅在已选择委派任务时读取；适用于任意 workflow 或用户直接提出的任务。规划安排时不要求尚未产生的业务工件或会话句柄。

## 输入

按 <Path>{roots.references}/coordination/session-files.md</Path> 的恢复需要选择即时只读返回或持久 TASK/REPORT，不按通道名称强制文件。较大资料引用真实位置，不复制整库。

| 内容 | 要求 |
|---|---|
| 目标与身份 | 用户目标、任务用途、交付物、用户指定的交付数量和成功定义；存在的业务对象使用实际 ID，跨领域区分 workflow 与对象，不制造 Goal/Ticket |
| 能力与依赖 | 实际 Work/Skill 入口、所需前置、原规格和已锁定决定、上游产物或报告；不假定接收方能读取 Lead 的对话 |
| 工具与模型 | 用户约束与主 Agent 当次获准选择、当前接口和原生通信方式；检查可用性，不固化厂商或模型名 |
| 工作区与写集 | 项目根、实际执行位置、基线/固定审查输入；逐项允许写入、只读与共享路径及 owner，包括报告位置 |
| 权限与验收 | 已授权动作、停止条件、实际检查、未执行 Gate 及其 owner；状态/审批/知识等原 gateway，Lead 的最终验收 |

任务用途可以是规划、拆票、讲解、实现、review、research、test-observation、handoff 或其他明确目的。用途名称不授予写权限；未分配路径默认只读。review/research/test-observation 默认只读业务文件，允许明确的报告和测试产物。handoff 需要用户明确调用，不因任务完成自动激活。

## 执行上下文

先读分配的真实 Work/Skill，执行指定范围；没有需要调用的 Skill 时依据明确用户目标和验收执行。Worker 可以直接写指定的计划、票据、地图、说明或代码等产物，不接管 Lead、不擅自再次派遣或扩大目标。正式状态、批准、Evidence、集成和永久知识仍由原 owner/gateway 在验收后处理；领域工具自己的事务记录按其原协议生成。缺输入、权限或 owner 冲突时返回问题与证据。

采用文件交接时只写分配产物与自己的 REPORT，不改 TASK，也不在任务目录添加其他文件；TASK 投递后冻结，Lead 不与 worker 并写业务产物。上下文变化影响目标、基线或权限时先确认旧 writer 停写，再建立新 task，不能覆盖旧记录。共享资源和 Git index 由 owner 串行协调；审查输入漂移后重新核验。

## 返回

交付实际文件/内容、关键决定、检查命令和退出码、真实环境、未验证项、问题和下一安全动作；研究给来源，review 给 findings，说明任务给解释与依据。即时只读结果关联真实 call/task；持久交接依 <Path>{roots.references}/coordination/report-template.md</Path> 形成 REPORT。Lead 按 <Path>{roots.references}/coordination/result-and-recovery.md</Path> 核验。

历史信息先读前序报告的聚焦交接，细节不足再按该报告里的可选 `Session log` 行检索少量日志。准确路径只写在这一行；取不到时省略整行，不猜路径，不另建文件。

## 外部网页分支

仅在用户选择外部网页交付时读取 <Path>{roots.references}/coordination/exchange/external-web.md</Path> 与 <Path>{roots.references}/coordination/exchange/source-package.md</Path>。传输可以用临时压缩包，传完立即删除；交接目录仍然只有 TASK.md 与 REPORT.md。其他派遣不生成压缩包。

