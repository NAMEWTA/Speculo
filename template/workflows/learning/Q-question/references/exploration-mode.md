# Explore 主动探究分支

仅 `mode=explore` 时读取；入口已经完成 Learning v2 激活、stable Change ID、locator、锁及授权检查。本分支不调用 socratic skill 的 tutor/mine 协议。

读取 `<Path>{roots.workflows}/learning/common/rules/inquiry-depth-policy.md</Path>` 与 `<Path>{roots.workflows}/learning/common/rules/question-map-contract.md</Path>`；工程主题才读取 `<Path>{roots.workflows}/learning/common/rules/production-inquiry.md</Path>`。输出模板是 `<Path>{roots.workflows}/learning/Q-question/exploration-template.md</Path>`。

<!-- portable:explore:start -->
## 主动探究方式

适用于用户明确要求主动挖掘、发现未提出的问题、分析实际失败或直接深入讲解。默认先回应核心问题，再给出有理由的重点发现，展开最值得处理的分支。无需等待学习者完成所有题目；不伪造学习者答案，也不把 AI 自问自答作为学习者表现。

先限定主题、已有材料、目标和证据范围。缺少非关键背景时用明确假设推进；关键证据缺失只阻塞依赖该证据的结论。初学者先补必要模型，不用大量反问掩盖未解释的概念。用户明确指定问题数量时尊重该数量；没有指定则按相关性和本轮范围选择，不套用固定五题或源码挖掘上限。

形成发现清单：潜在盲区/已观察的偏差、为何遗漏、为什么重要、父问题或触发证据。主要分支按机制、证据、方案/代价、验证与边界展开。其他分支明确标注待证据或暂缓，不假装已经处理。

使用独立探索记录，依次包含 `## Scope`、`## Discovery`、`## Deep Dive`、`## Verification`、`## Next`。元数据有 `exploration_id`（`EX-001-topic` 形式）、`mode: explore`、`status: active|blocked|closed`、非空 `question_ids` 列表。关联问题写入问题地图；每个 focus ID 必须属于本记录。

Next 说明本轮停止原因、未解决项与可选后续；不自动开展新批次或其他任务。active 可继续补充；blocked 保留缺失证据与恢复条件；closed 是本轮结束，不是学习者掌握。关闭时 focus 问题必须已 resolved、needs_evidence 或 deferred。关闭后重新探索需新记录与父问题链接。
<!-- portable:explore:end -->

## 工作区落盘与验证

仅写当前 Change 的 `inquiry/explorations/EX-<NNN>-<slug>.md`、`inquiry/question-map.json`，以及已授权的 `inquiry/INDEX.md`、`learning-log.md` 和 Change 状态。不写 `lessons/`、`homework/`、`goal/`、mastery 或永久 context；不出现 learner `Response:`、`Submission:`、Q/A 和 verdict 协议字段。

候选记录与候选地图先在当前 Change 的 `inquiry/` 暂存；地图 artifact 仍指向正式目标，通过 `--artifact` 指明。不得先覆盖正式地图再校验。验证命令：

```bash
node <Path>{roots.workflows}/learning/Q-question/tools/validate-exploration.mjs</Path> --change-dir <当前Change绝对路径> --file <候选记录相对路径> --map <候选地图相对路径> --artifact <正式记录相对路径>
```

用户明确指定问题数量 n 时附加 `--expected-count <n>`，不得以默认重点数量截断；未指定时不填该参数。

全部验证成功后，在原有根锁下重读基线，依次发布记录、地图、索引/日志，再更新 Change `.status.json`（phase 仍为 teaching，works_run 包含 learning/question，完成本次调用后清空 current_work）。若中途失败保留候选与恢复说明，不推进状态；工件/地图冲突时只阻塞相关写集，不猜测赢家。没有现成写权限时先取得入口要求的确认。

恢复时用稳定 ID 解析当前位置，先读本记录和地图相关 ID，再取少量权威证据；不遍历整棵历史。新结构不要求迁移 Learning v2 或改写旧 IQ。验证器只检查结构、引用、路径和提供的证据文件是否存在，不认证分析质量、用户理解或测试内容真实性。
