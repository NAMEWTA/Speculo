# GitHub 远程操作合同

本协议及 <Path>{roots.workflows}/specdev/T-triage/scripts/github-transport.mjs</Path> 由 T 唯一维护。C、command 或其他调用方可直接复用：不激活 T、不创建 change、不改 current_work；原调用方拥有报告、授权与回执。

## 输入与操作

显式传入 repo、目标编号或分支、正文文件和操作。读取失败、分页不完整、对象类型不符、SHA/正文漂移时停止受影响操作。

- issue-read / pr-read：完整可见内容；PR 包含评论、reviews、review comments、文件与 diff、不可变 base/head SHA、读取时间和完整性证据。
- issue-search：候选检索；limit 是检索范围，不代表已穷尽仓库。
- issue-create：title、body-file、labels，可选 marker；调用方先去重。
- issue-comment-close：comment-file、marker、reason；按 marker 幂等评论，执行后确认关闭。
- pr-create：base、head（同仓分支或 owner:branch）、base-sha、head-sha、title、body-file、marker；默认创建 draft。
- pr-update：number、base-sha、head-sha、expected-body-sha256、title、body-file、marker。
- pr-ready：number、base-sha、head-sha、expected-body-sha256；另需本次可审查授权。

运行脚本 --help 查看完整参数。所有参数使用 argv，不拼 shell。操作返回 JSON，失败退出非零；脚本不写任何 workflow 或 command 状态。

## 写入与恢复

默认 dry-run，外部写入为零。调用方在写前展示准确目标、内容与动作并取得明确授权后才传 --apply。已授权同一动作不重复索取授权；目标/内容发生实质变化则重新确认范围。PR、push、merge、release 各自独立。

对外正文标明 AI 协助。持久工件不保存凭据、Cookie、认证输出、机器绝对路径或未脱敏日志。临时正文文件由调用方管理。

执行前重读目标和预期 SHA/正文摘要；执行后重读验证。超时不表示未写入，先查询稳定 marker/目标再恢复，不能盲目重建。重复 marker、多候选、并发漂移或读回不符时返回失败，由调用方保存已完成步骤和恢复条件。本地开发事实不因远程失败回滚。
