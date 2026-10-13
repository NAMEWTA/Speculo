# 证据与验证规范

验证回答“怎样证明”，Evidence 记录“实际运行了什么、在哪个状态运行、结果和残余风险是什么”。

## 1. 验证矩阵

每行绑定行为、合同或风险，并标记环境：

| 行为或风险 | 接缝 | 命令/方法 | 环境 | 预期 | Evidence |
|---|---|---|---|---|---|
| 正常/失败路径 | 公共接口或稳定接缝 | 定向测试 | current-workspace 或 source-worktree | 合同成立 | Ticket Evidence |
| 跨模块回归 | 集成接缝 | 回归命令 | current-workspace 或 parent-candidate | 组合状态成立 | Ticket Evidence |
| E2E required | 真实端到端边界 | 场景步骤 | current-workspace 或 parent-candidate | 外部行为成立 | Ticket Evidence |

## 2. 两层验证

### Current workspace

current 模式的 implementation owner 在当前父分支和当前 workspace 工作。Ticket 必须严格串行，workspace clean 后形成非空 implementation commit；Lead 在同一 workspace 执行适用集成/回归和 E2E，并在父 HEAD 未漂移时将 Ticket commit 记录为 result SHA。

### Source-worktree

implementation owner 运行最接近目标行为的单元/组件测试、静态分析、类型、lint/build 等适用非 E2E 检查。来源实现必须在 clean worktree 形成 commit。任何 source-worktree E2E pass 声明无效。

### Parent-candidate

required 模式下，Lead 在最新父分支与 source commit 的 candidate 状态运行受影响集成/回归、项目父状态检查和适用 E2E。E2E 由实际跨边界风险决定，不限于 UI；not-required 必须写理由。required E2E 未运行或失败时不得推进父分支。

### Direct Spec

获批 Direct Spec 不创建 Ticket worktree 或 candidate。Lead 在 current workspace 记录实施前基线，运行轻量合同要求的定向检查、适用回归与 E2E，并记录最终 checkpoint、dirty 状态、运行环境、命令、退出状态和未运行原因。E2E 仍只由 Lead 执行；不得为套用两层验证而伪造 Ticket、source/candidate/result 或父分支推进证据。

低层证据不能替代明确要求的外部行为证据。高风险迁移还需要 dry-run、调用点扫描、数据核对、监控或恢复演练。

## 3. Agent 声明

任务执行者 只返回候选命令与结果，不写 Evidence。Lead 重读 workspace/Git、必要时复跑或核对输出后落盘；外部 provider 自报、截图、模拟和推断在此之前标记 `unverified`。review/research/test-observation agent 不拥有 E2E Gate。

## 4. 失败分类与完整性

失败分类为本 Ticket 新失败、基线既有失败、环境/权限/基础设施失败、无效验证或 candidate stale。不得通过跳过、放宽断言、吞错、删除用例或迁移验证位置制造绿色。

受控反向验证只用于可能静默通过的关键门禁：证明检查能在目标风险出现时失败，再恢复并重跑。普通测试不为形式执行破坏性操作。

## 5. Evidence 最低内容

每个 Ticket Evidence 至少包含：Lead、Dispatch/返回（若有）、workspace 策略、base/source/result SHA、candidate 字段（required 模式适用，current 模式明确不适用）、实际路径、每条命令/环境/退出状态、合同映射、双轴审查、E2E disposition、未运行项、失败分类、偏差、残余风险和父分支重读结果。

required Ticket Done 必须有 source commit、通过 candidate、父分支 result 与 Lead Evidence；current Ticket Done 必须有 implementation commit、通过 direct-parent 验证、父分支 result 与 Lead Evidence。无法运行 required 验证、存在未批准偏差、父分支未包含 Ticket commit 或 Evidence 不完整时不得 Done。

Direct Spec Evidence 至少包含：用户批准与轻量合同、Lead、实施前/最终 checkpoint、实际路径、定向/回归/E2E 命令及环境、验收映射、未运行项、偏差、残余风险和提交授权状态。

父实现 change 的 Implementation Orchestration Evidence 不能替代子 Evidence。它至少记录最终 Map revision、全部成员最终状态和子证据指针、dependency/serialization 实际顺序、跨 change 合同检查、aggregate 命令/环境/结果、stale candidate 处理、偏差和残余风险。任何成员未 completed 或整体验证未通过时不得形成父完成证据。

Evidence 原文不出仓库。对 GitHub 的公共投影由 T-triage publish 按公共投影规则生成，不替代本文件的完整记录。

## 6. 按改动选择检查与复用证据

先固定当前真实 base/head、dirty 写集、配置和消费者，选择能在本次回归上失败的最窄检查；动态配置、Worker、子进程、发布构件或跨模块接口需显式选择真实入口。CI 负责目标项目规定的全量矩阵，本地不因 commit/push 机械重跑刚通过且仍有效的检查；原 required Gate 不因此降级。

复用记录须给出原证据、代码/输入/配置/Skill 摘要、命令选择、环境和仍成立的原因。基线合入、head 改变、配置/依赖/生成器或被测输入变化时重估失效范围；不能把不相关改动当作所有证据永久无效，也不能沿用旧 head 的完成结论。readiness、skipped、pending、环境失败和未运行分别报告。

异步、资源、CI 或测试删除使用 <Path>{roots.workflows}/specdev/common/rules/test-reliability.md</Path>；失败后的状态和安全继续使用 <Path>{roots.workflows}/specdev/common/rules/error-handling.md</Path>。验证结果须关联真实退出、事件、文件或输出，不能只相信组件/Agent 自报。

## 7. 特殊行为与文档证据

纯文档使用可执行示例、链接、类型与生成一致性、源码语义核对；不适用代码 TDD/E2E时明确理由。prompt、工具定义、错误或 UI/CLI 字符串改变属于行为变化，检查真实模型/用户可见内容，不只检查 Markdown。UI 原型、mock、真实服务器演示分别标记；录制证据对应准确提交、环境、运行方式和片段，不能拼接不同运行冒充一次成功，也不强制无关任务录 GIF。

性能测量必须有真实用户操作、可比较工作量/时钟/冷暖状态、原始样本与端到端结论；微基准改善不能代替整体收益。专业分支仅在原报告追加 <Path>{roots.workflows}/specdev/common/rules/engineering-evidence.md</Path>，结构通过不证明测量、翻译或工具执行真实。

删除、合并测试的决定需记录旧行为/错误/兼容/回归到新用例的覆盖承接；无法证明就保留。新准入规则至少有一个从真实执行入口失败的反例，并在恢复基线后确认通过。
