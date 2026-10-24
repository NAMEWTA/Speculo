# 汇总未归档 RETRO 并沉淀

仅在用户明确要求从积累记录筛选、沉淀 ADR/context、迭代项目 Skills，或恢复一份已批准方案时进入。默认日常 retro 不进入此分支。

1. 读取 [独立工件合同](records.md)，用独立校验器 `--list` 枚举当前项目 retro 下的现役报告，排除 archive 和方案对象。不递归采集全部 changes/历史会话；用户限定主题或报告时先过滤。没有候选返回 no-candidates。草稿或错误报告列为覆盖缺口，不静默当成完整经验。
2. 固定本轮完整报告 ID/摘要清单，逐份读原文与 findings，再按根因/适用能力聚合。按报告/F-ID 搜索先前方案的相关处置及回执，复用已验证结论；同一原始事件不因多次引用增加频率。尚未归档报告有既往部分成果时，复核成果是否仍有效，必要目标用 retain，不能重复写规则。
3. 按 <Path>{roots.references}/writing-for-agents/references/project-skill-maintenance.md</Path> 对照当前代码、模板、测试、检查配置和已有 Skill。明确旧结论仍有效、已解决、已过时、相反证据或待验证；保留有证据的成功经验，不能只追加错误清单。
4. 使用 [升级方案模板](../assets/upgrade-plan-template.md) 保存具体方案与完整候选。逐个 finding 采纳、合并、拒绝或延期，说明理由；合并项仍保留各自 ID。自动检查/代码/CI 问题交原实施入口，未完成时 defer，不能用 Skill 禁令冒充 guardrail。项目 Skill 默认更新已有，缺失且有独立复用价值才新增。架构取舍进入 ADR，项目规则、经验与错误模式进入 context；按 A 的毕业标准筛选并保留来源链。对疑点按 [会话来源](session-provenance.md) 回读原始过程。
5. 展示按严重程度排序的证据、精确 diff、验证与拟归档清单，等待该方案的明确确认。申请的是已可审阅的结果，不是笼统“允许优化”。仅要求梳理时交付方案后结束；确认前不写目标、不移动报告。已覆盖当前完整方案的确认直接复用。
6. 确认后冻结原方案和候选，记录实际批准，保存 before-image，运行 apply 预检。每项由计划指定 writer 执行：Skill 由 R 调用共享维护方法，ADR/context 交 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/retro-knowledge.md</Path>；逐项回读与验证，结果写 execution.json。并行 writer、目标漂移、owner 冲突、引用失效只停止依赖分支。未完成项不能标 verified。
7. verified 校验通过后，调用 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/retro-archive.md</Path> 的 A-owned 窄网关。只移动 PLAN.archive_reports；每份报告全部发现均已验证采纳或明确拒绝才可列入。还有 defer 的报告继续现役；不另复制一份“下期待办”。全部报告封存后，最后封存本方案对象。

原方案是这次决策与执行的唯一负责工件。升级失败不归档待处理报告；归档部分失败保留已移动位置和原回执，从真实检查点恢复。最终给出更新/新增/保留列表、验证命令/退出码、已归档和仍待处理报告，以及下一入口。
