# 专业分支的工程证据

本规则只约束新运行的 R.performance、I.documentation 和 D.evidence-triage；既有工件与主持久化 schema 不升级。普通 Work 不要求额外记录。记录是某次 checkpoint 的观察，不拥有 Ticket/Goal/change 状态、授权或恢复锁；不能用它代替原 Evidence、诊断和验收。

## 写入原 owner

在原工件正文添加 `Engineering Evidence` 小节及一个标记为 `json specdev-engineering-evidence` 的代码围栏，里面是一个 JSON 对象。performance 位于 <Path>{roots.state}/specdev/changes/{change}/architecture-review.md</Path>；incident 位于 <Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>；documentation 位于原本票 <Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path> 或原 <Path>{roots.state}/specdev/changes/{change}/evidence/direct-spec.md</Path>。禁止写到另一模式的 owner，旧归档与旧完成证据不回填。

公共字段：`version: 1`、`kind`、实际源码/输入的 `checkpoint`、非空 `evidence` 字符串数组。指针使用原 Path/来源定位约定，不写机器绝对路径、密钥或未脱敏数据。记录每次真实观察，恢复时追加新 checkpoint 的证据；不能更改旧事实来制造成功。

## Performance

`operation` 是用户操作，`outcome` 为 baseline、improved、no-gain 或 inconclusive，`uncertainty` 解释测量局限。没有样本时只能 inconclusive。baseline/candidate 各含实际 `checkpoint`、`entrypoint`、`environment`、`clock`、`workload`、64 位 `workload_digest`、`unit`（ms/bytes/ops/s）、`direction`（lower/higher）、`cache`（cold/warm/not-applicable）、`excluded_costs` 字符串数组和有限非负 `samples` 数组。

普通 R 调查只记录 baseline 或 inconclusive；improved/no-gain 需已有可比较的 baseline 与 candidate。比较除源码 checkpoint 外的工作量、入口、环境、时钟、单位、方向、缓存与排除成本必须一致。improved 还需 `behavior_verification: passed`，并且样本算术均值沿目标方向改善。满足这些必要条件仍不证明超过噪声、具备统计显著性、内存可接受或测量真实，Lead 必须回读数据与行为证据。

## Documentation

记录 `owner_paths`（真实源指针数组）、`outcome`（verified/partial/blocked）、`visible_behavior_changed` 布尔值、`behavior_verification`（passed/failed/not-run/not-applicable），以及非空 `claims` 数组。每项 claim 有 subject、method（command/source/manual）、state（verified/unverified）和 evidence。未验证项必须写 reason；verified 的 command 项还必须有 command、`executed: true`、`exit_code: 0` 和非空 output 原始结果摘要数组。

总体 verified 要求所有声明 verified；可见行为改变时必须有 passed 的行为证据。partial/blocked 是诚实的阶段结果，不授予 Ticket done。工具仍不能认证 Agent 自报，Lead 继续核对真实命令、输出和来源。

## Incident

记录非空 facts、unknowns、next_checks 字符串数组；`feedback_loop_ready: false` 与 `root_cause_confirmed: false` 必须明确。这是事件证据截面，不是根因结论。正式 diagnosis 的红灯、假设和状态仍由原诊断规则验证；未来获得红灯后保留原事件观察，转入正常 D 流程，不把旧观察改写成当时已确认。

## 验证入口

新分支分别执行现有校验器的 `--engineering performance`、`--engineering documentation` 或 `--stage diagnosis --engineering incident`，输入当前 change。可与原 `--repo` 和适用 `--stage` 结合。没有标记记录的历史工件继续按原规则验证；显式专业模式缺少记录会失败，已有标记记录在普通 change 校验中也会检查。

代码块语法是 `json specdev-engineering-evidence`，不是新文件类型。校验器只读，无论成功、失败或不完整都不写状态、不创建缺失工件、不执行命令、不获取授权。源记录、结构校验、真实工具执行和宿主观察是不同证据，报告时分别说明。
