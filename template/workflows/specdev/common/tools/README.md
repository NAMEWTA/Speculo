# SpecDev Tools

## 校验一个 change

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --stage <triage|diagnosis|grill|spec|tickets|goal-plan|implement|learn-change|review|prototype|wayfinder|complete> \
  --repo <project-root> \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

`--stage` 只要求该阶段已经拥有的工件；所有已经存在的工件仍会验证。`goal-plan` 还会读取父 change 的 sibling 成员，要求每个成员已有 Ready Spec/Tickets，校验组合 Ticket DAG、唯一父归属、serialization、跨 Ticket 写路径、全局 workspace/实现配额和完成门。省略 stage 时验证当前存在的工件，不会因未来 Work 尚未运行而报错。`--repo` 可选；提供后会把状态中的 SHA、祖先关系、当前分支和完成时 clean 状态与真实 Git 仓库交叉验证。

## 校验 SpecDev 工作流包

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --self-check
```

工具只依赖 Speculo 已要求的 Node.js 运行时，不使用第三方包。返回码 `0` 表示没有阻塞性结构错误；warning 仍需人工判断。工具不替代项目测试、事实核验、设计审查或用户批准。

## 从 tickets-map 分析下一轮

```bash
node <Path>{roots.workflows}/specdev/common/tools/ticket-control.mjs</Path> --map <map-file> --repo <project-root>
```

接受普通 tickets-map、父 goal-tickets-map 入口或旧 Implementation Map。可选 --previous 读取上轮 JSON 输出作漂移检查；该输出应保存到调用方已有 Evidence，不建立第二套权威状态。输出 frontier、blocked、deferred、in_flight、invalidated 与逐票契约摘要。

只读工具不调用 Skill、不执行实现、不检查真实授权/正式记忆网关，不获取锁或自动解锁；Lead 必须在 dispatch 前完成这些检查。结构错误返回非零；局部错误仍可能带独立 frontier，调用方必须检查节点和全局 diagnostics。结构检查成功的退出码 0 不代表任务完成，且业务门禁可能仍阻塞全部票。eligible_for_final_verification 只表示可进入最终验收，不是 Goal completed。

`<Path>{roots.workflows}/specdev/common/tools/plan-contract.mjs</Path>` 是两个工具共用的只读校验库：新 Ticket 的真实 Skill 名称/摘要、必需调用证据、Map 数量合同、父入口与 W 候选图。普通 --repo 仍支持原 Git 事实验证；存在未完成票的真实项目 Skill 绑定时必须提供项目根。旧票可读，开始新实现前必须显式补齐 Plan 合同；已完成历史证据不要求当前 Skill 包仍与历史版本相同。
