# Evidence 与验证

I、C、P 验收时读取。环境由 change README 的执行上下文定位，不从票据串并行或 Agent 数量推导。

| 检查 | 执行位置 | owner | 证据 |
|---|---|---|---|
| 单元、组件、类型、lint/build、正常/失败路径 | change-workspace | 实际实现者 | 原 Ticket/Direct Spec Evidence |
| 风险适配双轴审查 | 选定工作区的固定 commit 或工作副本快照 | 按风险选择自查或未参与本范围实现的 reviewer | 原 Review / Independent Review 与工具核验 |
| 集成/回归及适用 E2E | change-workspace 的稳定交付输入 | Lead | 命令、退出码、观察、E2E disposition |
| 整体 AC/Gate | 同一 change 工作区；跨 change 按明确 aggregate 合同 | Lead | 原整体 Evidence |

有提交授权可用实际 commit 固定输入；没有授权时使用 <Path>{roots.workflows}/specdev/common/skills/code-review/references/working-tree-review.md</Path>。快照必须包含本票真实实现范围，保留其他票及用户改动的排除理由。单票通过不代表整个工作区全部通过；最终审查覆盖全部实际交付。

共享工作区验收前协调相关 writer 停写，测试资源/生成输出独占或明确隔离。Git index 操作串行；当前交付与固定输入、规范或标准不一致时重验受影响项。必需 E2E 未运行/失败不能写 passed，not-required 必须给理由。E2E Gate 仍由 Lead 拥有，不接受执行者自报代替。

Ticket 的 verified 执行记录和 done 状态基于真实改动、AC、检查与适用双轴审查；审查策略按 <Path>{roots.workflows}/specdev/common/skills/code-review/references/reviewer-contracts.md</Path> 判断。不要求每票提交、父分支推进或 candidate worktree。Direct Spec 同样逐 AC 验收，不制造票据。明确承诺的 Git/发布交付按原授权单列，失败不伪造成功。

重复失败按 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path> 保留历史并复盘。恢复读原 Evidence、Git 和工具事实，不从 REPORT completed 或进程退出推断验收通过。

低层证据不能替代明确要求的外部行为证据。高风险迁移还需要 dry-run、调用点扫描、数据核对、监控或恢复演练。

## 3. Agent 声明

任务执行者 只返回候选命令与结果，不写 Evidence。Lead 重读 workspace/Git、必要时复跑或核对输出后落盘；外部 provider 自报、截图、模拟和推断在此之前标记 `unverified`。review/research/test-observation agent 不拥有 E2E Gate。

## 4. 失败分类与完整性

失败分类为本 Ticket 新失败、基线既有失败、环境/权限/基础设施失败、无效验证或 固定输入漂移。不得通过跳过、放宽断言、吞错、删除用例或迁移验证位置制造绿色。

受控反向验证只用于可能静默通过的关键门禁：证明检查能在目标风险出现时失败，再恢复并重跑。普通测试不为形式执行破坏性操作。

## Evidence 最低内容

记录 Lead、实际派遣/返回、唯一 change 工作区引用、基线与实际 checkpoint/快照、真实修改路径、逐命令环境/退出结果、AC 映射、风险适配双轴审查、E2E disposition、未运行项、失败分类、偏差和残余风险。Direct Spec 同时保留实际授权和唯一获批规格，不制造 Ticket。

父 Implementation Orchestration Evidence 不能替代子 Evidence；至少记录最终 Map revision、成员状态/证据引用、dependency/serialization 实际顺序、跨 change 合同检查、aggregate 命令/环境/结果、漂移处置与残余风险。成员未 completed 或整体验证未通过不能完成父 change。

Evidence 原文不出仓库。对 GitHub 的公共投影由 D-delivery publish 按公共投影规则生成，不替代完整记录。

## 6. 按改动选择检查与复用证据

先固定当前真实 base/head、dirty 写集、配置和消费者，选择能在本次回归上失败的最窄检查；动态配置、Worker、子进程、发布构件或跨模块接口需显式选择真实入口。CI 负责目标项目规定的全量矩阵，本地不因 commit/push 机械重跑刚通过且仍有效的检查；原 required Gate 不因此降级。

复用记录须给出原证据、代码/输入/配置/Skill 摘要、命令选择、环境和仍成立的原因。基线合入、head 改变、配置/依赖/生成器或被测输入变化时重估失效范围；不能把不相关改动当作所有证据永久无效，也不能沿用旧 head 的完成结论。readiness、skipped、pending、环境失败和未运行分别报告。

异步、资源、CI 或测试删除使用 <Path>{roots.workflows}/specdev/common/rules/test-reliability.md</Path>；失败后的状态和安全继续使用 <Path>{roots.workflows}/specdev/common/rules/error-handling.md</Path>。验证结果须关联真实退出、事件、文件或输出，不能只相信组件/Agent 自报。

## 7. 特殊行为与文档证据

纯文档使用可执行示例、链接、类型与生成一致性、源码语义核对；不适用代码 TDD/E2E时明确理由。prompt、工具定义、错误或 UI/CLI 字符串改变属于行为变化，检查真实模型/用户可见内容，不只检查 Markdown。UI 原型、mock、真实服务器演示分别标记；录制证据对应准确提交、环境、运行方式和片段，不能拼接不同运行冒充一次成功，也不强制无关任务录 GIF。

性能测量必须有真实用户操作、可比较工作量/时钟/冷暖状态、原始样本与端到端结论；微基准改善不能代替整体收益。专业分支仅在原报告追加 <Path>{roots.workflows}/specdev/common/rules/engineering-evidence.md</Path>，结构通过不证明测量、翻译或工具执行真实。

删除、合并测试的决定需记录旧行为/错误/兼容/回归到新用例的覆盖承接；无法证明就保留。新准入规则至少有一个从真实执行入口失败的反例，并在恢复基线后确认通过。
