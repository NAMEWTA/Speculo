# Capture Protocol

仅在 Triage `mode=capture` 时加载。目标是把尚未成 Change 的记事项写成仍 open 的 GitHub Issue，并留下 workspace 级 `<Path>{roots.state}/specdev/capture.md</Path>`。

GitHub 是 inbox 和计数器，不是 tracker，也不是开发权威。capture 不创建、不选择、不改写任何 change。票级完成后投影走 publish，源 Issue 关闭走 reconcile，外部输入冻结走 intake；四者互不覆盖。

## 1. 触发与对象

用户必须给出至少一条记事项（标题、现在时摘要、分类）。禁止扫整个 workspace 自动发。允许一次授权批量多条；默认 **1 条记录 = 1 次未来 intake / 1 个未来 Change**。v1 不写 `related_locators`，不把 N 条 locator 塞进同一个未来 source。

相关但目标不清 → 先 capture 为多条 inbox，以后走 `<Path>{roots.workflows}/specdev/W-wayfinder/W-wayfinder.md</Path>` 或逐条 intake，不在本协议合并。

可选开关：排除 id 列表。目标 repo 默认从 `git remote` 推断，必须展示确认。

capture **不得**：

- 创建 change 目录或 `<Path>{roots.state}/specdev/changes/{change}/</Path>` 下任何工件；
- 写 `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>` / `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>` / `<Path>{roots.state}/specdev/changes/{change}/publish.md</Path>`；
- 设置任何 change 的 `current_work`；
- 加载 `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>`；
- 调用 `issue-comment-close` 或关闭刚创建的 Issue；
- 在本地复制 inbox 正文副本；
- 打 `specdev:published`、`specdev:change`、`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`。

只写 `<Path>{roots.state}/specdev/capture.md</Path>` 和经授权的远程 inbox Issue。缺失该账本合法，首次 capture 才创建。

## 2. 硬门

失败即停，零远程写入。已有账本行保持原 state。

1. 每条纳入记录有 id（`YYYY-MM-DD-<kebab>`）、现在时摘要、且 `kind` 为 bug、feature、refactor、investigation、operations、documentation 或 review。禁止 `mixed`。
2. 调用 `<Path>{roots.skills}/github-npm-ops/SKILL.md</Path>` 能读目标 repo、能 dry-run `issue-create`。本协议只用 `issue-search` / `issue-create`。
3. 分类映射见 `<Path>{roots.workflows}/specdev/T-triage/references/classification-map.md</Path>`。缺 type 标签时 dry-run 表列出将创建的标签，授权后才 `gh label create`。
4. 用户看见完整 dry-run 表（id、标题、标签、正文、reason）并给出 **本次** 明确确认。

origin 固定 `local`。marker：`specdev:capture:<id>`。

## 3. 准备记录

按 `<Path>{roots.workflows}/specdev/T-triage/references/public-projection.md</Path>` 脱敏。现在时，不是完成后的过去时，也不是派工祈使句。

Issue 正文：`<Path>{roots.workflows}/specdev/T-triage/issue-record-template.md</Path>`。

用 `<Path>{roots.workflows}/specdev/T-triage/capture-template.md</Path>` 写或更新 `<Path>{roots.state}/specdev/capture.md</Path>`。先把纳入行标 `planned`，用户排除的标 `skipped:duplicate` 以外的跳过由执行期判定。

## 4. 幂等执行

对每条纳入记录：

1. `issue-search` 查 marker 或精确标题 + `specdev:captured`。
2. 已存在且 marker 在且仍 open → 账本 `open`，跳过创建。
3. 已存在且 marker 在但已 closed → 停止该行，展示冲突，不重开、不覆盖。intake 已消耗的行应为 `intaken`，由 intake 协议回写，不由本协议改 closed。
4. 已存在但无 marker → 停止该行，展示冲突，不覆盖别人的 Issue。
5. 不存在 → dry-run `issue-create` → 授权后 `--apply` → 保持 **open**。marker 写在正文 Provenance。不评论、不关闭。
6. 任一步失败：该行 `failed`，记录已完成步骤和下一重试动作；已成功的记录不回滚。

`--apply` 只表示调用方完成本次确认，不替代授权。远程失败不补建本地 Change。

全部纳入记录到达 `open` 或合法 `skipped:duplicate`，且无 `failed` 时结束。用户明确放弃未发出的行：`waived`。重跑是恢复，不是重发。`intaken` 只由后续 intake 写入。

## 5. 校验与计数

账本存在时：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --capture <Path>{roots.state}/specdev/capture.md</Path>
```

缺失该文件时不要为了校验去创建它。

workspace inbox 计数：

```bash
node <Path>{roots.workflows}/specdev/T-triage/tools/capture-status.mjs</Path> \
  --state-root <Path>{roots.state}/specdev</Path>
```

数字只来自 `<Path>{roots.state}/specdev/capture.md</Path>`，不把 GitHub 搜索当权威，也不计入 `published_issues`。

## 完成标准

- 用户指定的记事项均有对应仍 open 的 GitHub Issue，或账本有合法 skip / waived；
- 每条已捕获 Issue 带且仅带一个 type 标签，以及 `specdev:captured` 与 `origin:local`；
- 正文是现在时 inbox 记录，不是派工单，也不是完成后投影；
- marker 使重跑不重复建贴；
- 未创建 Change，未写 `current_work`，未调用关闭；
- `<Path>{roots.state}/specdev/capture.md</Path>` 与远程重读一致，失败行可恢复；
- 未授权时远程写入为零。
