# 场景路由


| 场景 | 入口 | 正常出口 |
|---|---|---|
| 需要冻结外部来源或审计摄入 | T-triage intake | D / G / W / P / S / C / T |
| 尚未成 Change，只要先在 GitHub 留一条仍 open 的记事项 | T-triage capture | 停止 / 以后 intake / W |
| 本地 change 完成且来源可关闭 | D-delivery reconcile | A |
| 本地 change 完成且要把 Ticket 记到 GitHub | D-delivery publish | reconcile / A / 停止 |
| 疑难 bug 或性能回归 | D-diagnose-bugs | S / T / I / R / W |
| 模糊但可通过决策访谈收敛 | G-grill-with-docs | P / S / T / W |
| 大需求包含多个未界定 change 或未知路径 | W-wayfinder | G / P / D / S / T |
| 需要检测项目 UI、选择设计方向并生成可运行设计包 | P-prototype | G / S / T / I |
| 固定点 diff、branch 或 PR review | C-code-review | completed / T / S / G |
| 外部行为已清楚 | S-spec | I（完整 Ready Spec 且有实现授权）/ T（需要拆票）/ 返回规格 |
| Ready Spec 需要垂直切片 | T-tickets | P-goal-plan / I |
| 按需的轻量 Goal、单 change 或多个 Ready change 的 Goal 规划、持续实现与恢复 | P-goal-plan | I / verify / completed / blocked |
| Ready 执行 | I-implement | Delivery / A / blocked / deviation |
| 学习需求参考、本项目代码、已有 change 或外部项目与文章 | L-learn | 返回用户 / 继续提问；另有开发请求再选 G / W / S |
| 架构健康扫描 | R-review-architecture | G / T |

同 change 下一阶段需要当前一手推理且上下文健康时继续；切换 repo/person/harness 或旁路时使用 `<Path>{roots.commands}/handoff/COMMAND.md</Path>`；严格限定且可独立派单时使用 Dispatch Packet；其他长上下文以权威工件路径恢复。平台不支持 clear/compact 时不虚构操作。


本地已清晰请求不强制绕行 Triage。完成后要记账才选 publish；尚未成 Change、只想先留 inbox 记录才选 capture。publish、reconcile 与 capture 写不同远程对象，可先后执行。G 是单 change Grill，P-prototype 是 UI 设计，不与统一 P-goal-plan 混淆。W 发现候选后逐个交 G/S/T；单 change 拆票后可交 P 规划，多个 child 创建父 Goal 前仍须全部 Ready。原缺陷诊断 D、风险分诊、远程 reconcile、完成后发布投影和记事项捕获职责不删除。

## 复盘与交付路由

整体会话及开发过程复盘、积累带会话来源的独立 RETRO，以及明确要求汇总沉淀 ADR、项目知识或 Skills → <Path>{roots.workflows}/specdev/specdev-r-retro/SKILL.md</Path>。代码与参考资料学习 → <Path>{roots.workflows}/specdev/specdev-l-learn/SKILL.md</Path>；可在实现前直接进入，用户未指定 change 时由 L 新建学习载体。Speculo 产品反馈使用 speculo-feedback Command。CI/安全/PR/包发布 → <Path>{roots.workflows}/specdev/specdev-d-delivery/SKILL.md</Path> 的对应模式；确定性修复回到 D/I，不由 Delivery 接管代码。

长任务在阶段边界按产物与待决问题选择继续、压缩上下文或 handoff；交接只携带准确 owner、SHA、输入和未闭合动作，不硬编码特定模型的上下文阈值，不自动启动其他会话。

## 专业分支与相邻请求

| 请求 | 入口/分支 | 不因此触发 |
|---|---|---|
| 测量哪个用户操作值得优化 | R-review-architecture / performance | 不直接实现，不先发明性能阈值 |
| 已有性能故障需要确认根因 | D-diagnose-bugs | 不把微基准替代原始症状 |
| 一次性事件暂时无法重现 | D / evidence-triage | 不标记 root-cause-confirmed，不创建 Ready 修复 |
| 已批准的文档维护 | I-implement / documentation | 不新建文档 workflow，不伪造 TDD |
| 只审查文档或某个 commit | C-code-review | 不写项目、不把单 commit 扩大到 HEAD |
| 理解功能、实现思路、运行机制或文章观点 | L-learn | 不自动规划/实现，不改 Learning workflow，不永久晋升 |

只读调查或审查不是后续修改授权。清晰的小请求继续走原适用阶段，不因增加专业分支强制进入 W/G/Triage；无差异、无候选和证据不足均可诚实返回，不制造工作量。
