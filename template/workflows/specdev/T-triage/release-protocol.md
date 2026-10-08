# npm / GitHub Release 发布

先执行 <Path>{roots.workflows}/specdev/T-triage/release-preflight.md</Path>；读取已有 TRI 记录，模式变为 release 并保留预检证据。每阶段原子写入回执并重读。T 不写 docs-sync state，不更改 change 的完成事实。

1. 明确发布范围，展示普通提交、docs-sync、版本修改、release commit、分支/tag push、workflow 和发布目标的准确计划。只执行已获授权动作，沿用仍有效授权。
2. 如有待提交改动，按项目规则显式选路径，不用 stash 隐藏内容。质量闸通过后才能提交。调用 docs-sync 时遵守其范围和提交协议。
3. 保留 Unreleased，按项目格式迁移本版本 CHANGELOG；同步 package/workspace/lockfile 的必要版本。将版本与发布说明固定于同一 release commit，直接记录 SHA，不从模糊 commit message 推断。
4. 按批准的仓库策略推送分支并创建/推送精确指向该 SHA 的 tag。不自动 merge、不移动已有 tag。触发的 workflow 必须按准确 SHA、event、workflow 路径和 run ID 定位，不能只看最新一条 run。
5. 监控该 run；失败进入 <Path>{roots.workflows}/specdev/T-triage/release-recovery.md</Path>。成功后校验 workflow 与 SHA、GitHub Release tag/正文/发布状态，以及每个 required npm 包的明确 package@version 和目标 dist-tag。prerelease/非 latest 按原计划验证。
6. Release 正文来自已确认版本说明，按需读取 <Path>{roots.workflows}/specdev/T-triage/references/release-notes-injection.md</Path>。需要补记 docs-sync 输入节点时再次调用 docs-sync，由它维护游标；tag 保持不变。

记录最终 SHA/tag/run ID、每个目标读回结果、docs-sync 结果或不适用原因。任一 required 目标未知或失败不得标 completed，保留已发布事实和后续恢复条件。全部通过才将 TRI 标 completed，运行 --triage-run 校验并返回报告。
