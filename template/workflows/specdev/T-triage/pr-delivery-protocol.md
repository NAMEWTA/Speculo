# PR 交付

读取 <Path>{roots.workflows}/specdev/T-triage/remote-operations.md</Path> 与 <Path>{roots.workflows}/specdev/T-triage/references/issue-pr-policy.md</Path>。选择明确 change、目标 repo、base/head，确认相关代码与本地验证 Evidence；不自动提交或 push。

按 <Path>{roots.workflows}/specdev/T-triage/pr-record-template.md</Path> 创建 <Path>{roots.state}/specdev/changes/{change}/pull-requests/PR-###.md</Path>，ID 取最小未用正整数。delivery_target 按请求登记 draft 或 ready；要求 ready 时创建 draft 只是中间步骤，仍挡交付门。T 拥有该记录；不修改 external_action、publish_action 或 capture。

1. 固定远程 base/head SHA，核对本地提交对象。未推送的 head 先报告所需独立 push 动作。
2. 读取目标仓库 PR 模板，形成 Summary、Evidence、Before/After（适用时）、Merge Risk/rollback；记录 AI 协助。Evidence 必须可追溯，未验证项目明确列出。
3. 固定 marker=specdev:<change>:PR-###，冻结正文摘要。更新已有 PR 前读取 expected-body-sha256 与 SHA，人工变更需比较并重新形成更新内容。
4. 执行 pr-create/pr-update 的 dry-run，展示精确动作；授权后执行 --apply。默认创建 draft。可审查切换需检查 verification=passed 并单独执行 pr-ready。
5. 读回 URL、正文、draft 状态与 SHA，原子更新记录并重读，运行 SpecDev --stage pr-delivery。失败保留原记录；超时先按 marker 和分支查询。

requested=false 或 waived 的记录不挡归档；明确请求且 pending/failed 的 PR 交付挡对应交付门，不回退已完成代码事实。创建成功不意味着 merge 或 release 已获授权。返回 PR、记录、验证和下一动作。
