# 场景路由


| 场景 | 入口 | 正常出口 |
|---|---|---|
| 需要冻结外部来源或审计摄入 | T-triage intake | D / G / W / P / S / C / T |
| 本地 change 完成且来源可关闭 | T-triage reconcile | A |
| 疑难 bug 或性能回归 | D-diagnose-bugs | S / T / I / R / W |
| 模糊但可通过决策访谈收敛 | G-grill-with-docs | P / S / T / W |
| 大需求包含多个未界定 change 或未知路径 | W-wayfinder | G / P / D / S / T |
| 需要检测项目 UI、选择设计方向并生成可运行设计包 | P-prototype | G / S / T / I |
| 固定点 diff、branch 或 PR review | C-code-review | completed / T / S / G |
| 外部行为已清楚 | S-spec | T-tickets |
| Ready Spec 需要垂直切片 | T-tickets | P-goal-plan / I |
| 单个或多个 Ready change 的 Goal 规划、持续实现与恢复 | P-goal-plan | I / verify / completed / blocked |
| 旧 O 调用或恢复键 | P-goal-plan | 统一 P 多 change 模式 |
| Ready 执行 | I-implement | Triage / A / blocked / deviation |
| 开发完成后需要理解当前 change 或追问实现 | L-learn-change | 返回用户 / 继续提问 / Triage / A |
| 架构健康扫描 | R-review-architecture | G / T |

同 change 下一阶段需要当前一手推理且上下文健康时继续；切换 repo/person/harness 或旁路时使用 `<Path>{roots.commands}/handoff.md</Path>`；严格限定且可独立派单时使用 Dispatch Packet；其他长上下文以权威工件路径恢复。平台不支持 clear/compact 时不虚构操作。


本地已清晰请求不强制绕行 Triage。G 是单 change Grill，P-prototype 是 UI 设计，不与统一 P-goal-plan 混淆。W 发现候选后逐个交 G/S/T；只有清晰且 Ready 的 child 才交 P。原缺陷诊断 D、风险分诊和远程 reconcile 职责不删除。
