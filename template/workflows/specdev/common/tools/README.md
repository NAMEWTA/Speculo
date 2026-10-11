# SpecDev Tools

## 校验一个 change

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --stage <triage|diagnosis|grill|spec|tickets|goal-plan|implement|learn-change|retro|pr-delivery|review|prototype|wayfinder|complete> \
  --repo <project-root> \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

`--stage` 只要求该阶段已经拥有的工件；所有已经存在的工件仍会验证。单 change 的 `goal-plan` 要求自己的 Goal Plan，允许合法的 `draft / ready_for_execution: false`；Tickets 阶段可尚无 Goal。Goal 的就绪字段必须是布尔值并与状态对应。

存在 Implementation Map、Implementation Plan 或 goal-tickets-map 入口中的任一项即走父编排校验；缺少另一父工件会报错，不回退单 change，也不额外要求单 change Goal。父编排读取 sibling 成员，创建时要求每个成员已有 Ready Spec/Tickets，继续校验组合 Ticket DAG、唯一父归属、serialization、跨 Ticket 写路径、全局 workspace/实现配额和完成门。已有父 Map/Plan 尚未补建无状态入口时仍可验证。

省略 stage 时验证当前存在的工件，不会因未来 Work 尚未运行而报错。`--repo` 可选；提供后会把状态中的 SHA、祖先关系、当前分支和完成时 clean 状态与真实 Git 仓库交叉验证。

校验 workspace 捕获账本（文件必须已存在；缺失时不要为了校验去创建）：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --capture <Path>{roots.state}/specdev/capture.md</Path>
```

## 校验 SpecDev 工作流包

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --self-check
```

工件结构校验只依赖 Speculo 已要求的 Node.js 运行时，不使用第三方包。真实 Git 检查、review-scope 和包 self-check 中的隔离回归另需 Git；self-check 会在系统临时目录创建并清理测试仓库，不修改用户项目或 workflow 状态。返回码 `0` 表示没有阻塞性结构错误；warning 仍需人工判断。工具不替代项目测试、事实核验、设计审查或用户批准。

## 从 tickets-map 分析下一轮

```bash
node <Path>{roots.workflows}/specdev/common/tools/ticket-control.mjs</Path> --map <map-file> --repo <project-root>
```

接受普通 tickets-map、父 goal-tickets-map 入口或旧 Implementation Map。可选 --previous 读取上轮 JSON 输出作漂移检查；该输出应保存到调用方已有 Evidence，不建立第二套权威状态。输出 frontier、blocked、deferred、in_flight、invalidated 与逐票契约摘要。

单 change 的 Goal Ready 不要求所有未来票同时 Ready。合法 draft 票保留缺口与重审条件，只阻塞自身及依赖闭包；`ready/in_progress/review` 却没有 `ready=true` 是逐票错误。frontier 只包含自身 Ready、依赖成功完成、owner/资源/并发条件满足的票；上游 done 不自动修改消费者状态。全局执行门未满足时无可派单票，空 frontier 的 blocked/deferred 说明恢复条件。多 change 父创建的全员 Ready 输入门保持不变。

只读工具不调用 Skill、不执行实现、不检查真实授权/正式记忆网关，不获取锁或自动解锁；Lead 必须在 dispatch 前完成这些检查。结构错误返回非零；局部错误仍可能带独立 frontier，调用方必须检查节点和全局 diagnostics。结构检查成功的退出码 0 不代表任务完成，且业务门禁可能仍阻塞全部票。eligible_for_final_verification 只表示可进入最终验收，不是 Goal completed。

`<Path>{roots.workflows}/specdev/common/tools/plan-contract.mjs</Path>` 是两个工具共用的只读校验库：新 Ticket 的真实 Skill 名称/摘要、必需调用证据、Map 数量合同、父入口与 W 候选图。普通 --repo 仍支持原 Git 事实验证；存在未完成票的真实项目 Skill 绑定时必须提供项目根。旧票可读，开始新实现前必须显式补齐 Plan 合同；已完成历史证据不要求当前 Skill 包仍与历史版本相同。

## 专业分支与审查固定点

原 change 校验支持 `--engineering performance|documentation|incident`，要求对应原 owner 工件中的标记证据；不传时仍检查已经存在的标记。字段见 <Path>{roots.workflows}/specdev/common/rules/engineering-evidence.md</Path>。历史无标记工件不强制回填，所有路径只读。

`--review-scope --repo <project-root> --mode baseline|range|commit|pr` 是独立只读模式，不选择 change、不加载状态、不访问网络。baseline/pr 使用唯一 merge-base；range 比较两个端点；commit 只比较指定提交与其父，不用当前 HEAD。前三种端点模式传 `--base` 与 `--head`；commit 传 `--commit`，多父提交还须 `--parent`。PR 必须传刚读取的完整 base/head SHA。根提交没有现有 CR 所需的 committed fixed point，明确拒绝，不编造父提交。

输出包含固定 SHA、实际 diff argv、内容摘要、路径和 changes/no-diff；无差异退出 0，但不是审查 approved。无效引用、歧义 merge-base、缺参数、重复参数或外部工具失败返回非零。差异不执行外部 diff/textconv，受限输出不会泄漏全日志。

包级 self-check 同时执行内置工程合同回归测试；测试用临时目录和真实 Git fixture，既验证合法输入，也从本顶层入口证明非法记录被拒绝。测试不调用远程、不接管状态、不认证真实模型遵从。
