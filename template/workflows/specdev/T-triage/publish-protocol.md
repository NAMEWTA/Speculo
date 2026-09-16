# Publish Protocol

仅在 Triage `mode=publish` 时加载。目标是把已完成 Change 的计划内 Ticket 投影为带分类标签的 GitHub Issue，用脱敏 Evidence 关闭它们，并留下 `<Path>{roots.state}/specdev/changes/{change}/publish.md</Path>`。

GitHub 是投影和计数器，不是开发权威。源 Issue 的关闭仍走 reconcile，与本协议互不覆盖。

## 1. 触发与对象

用户必须指定一个已存在的 change（active 或尚未归档的 completed）。禁止扫整个 workspace 自动发。

可选开关：`include-cancelled`、`force-parent` / `no-parent`、排除票号列表。目标 repo 默认从 `git remote` 推断，必须展示确认。

没有先前 intake 时允许补写：

- `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`，`mode: publish`，`publish_action: pending`；
- 轻量 `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>`：`source_type` 为 `conversation | pasted | local-file`，`canonical_locator: null`，`close_capability: not-applicable`。禁止虚构 GitHub locator。

publish **不得**改 Ticket / Spec / Evidence / Goal / change completed 事实。只写 `<Path>{roots.state}/specdev/changes/{change}/publish.md</Path>`、`<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>` 的 publish 字段，以及经授权的远程投影。

## 2. 硬门

失败即停，零远程写入。`publish_action` 保持 `not-requested`（尚未开始）或变为 `publish-failed`（已开始后失败）。

1. 按 `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>` 重验本地完成。
2. 至少一张可发布票：status `done`，或用户选择纳入的 `cancelled`。没有 Ticket 文件（纯 Direct Spec）时停止；v1 不发 Change 级单 Issue。
3. 调用 `<Path>{roots.skills}/github-npm-ops/SKILL.md</Path>` 能读目标 repo、能 dry-run `issue-create`。
4. 分类映射见 `<Path>{roots.workflows}/specdev/T-triage/references/classification-map.md</Path>`。缺 type 标签时 dry-run 表列出将创建的标签，授权后才 `gh label create`。
5. Change `classification` 为 `mixed` 时，确认表上每张纳入票都有 `kind`。
6. 用户看见完整 dry-run 表（标题、标签、正文、关闭评论、reason）并给出 **本次** 明确确认。

cancelled 默认跳过，账本记 `skipped:cancelled`。只有 `include-cancelled` 或确认表勾选才建 Issue，并以 `not_planned` 关闭。

父 Change Issue：纳入票数 ≥ 2 时默认创建；1 票时票 Issue 本身就是记录。`force-parent` / `no-parent` 覆盖默认。v1 只用正文 `Part of #<n>` / `Blocked by #<n>`，不上 native sub-issue API。

## 3. 准备投影

对每张纳入票读取 Ticket 与对应 Evidence，按 `<Path>{roots.workflows}/specdev/T-triage/references/public-projection.md</Path>` 脱敏。

- Issue 正文：`<Path>{roots.workflows}/specdev/T-triage/issue-body-template.md</Path>`（过去时）。
- 关闭评论：`<Path>{roots.workflows}/specdev/T-triage/close-comment-template.md</Path>`。
- `kind` 缺省继承 Change 分类；写回票 frontmatter 可选，账本该行必须有 `kind`。
- origin：源 `close_capability` 为 supported 或 locator 是 GitHub Issue/PR 则为 `intake`，否则 `local`。
- marker：`specdev:<change>:<ticket-id>:published`。

用 `<Path>{roots.workflows}/specdev/T-triage/publish-template.md</Path>` 写或更新 `<Path>{roots.state}/specdev/changes/{change}/publish.md</Path>`。先把纳入行标 `planned`，跳过行标 `skipped:cancelled` 或 `skipped:excluded`，`publish_action: pending`。

## 4. 幂等执行

顺序：先父（若有）→ 按 `blocked_by` 拓扑建子 → 回写父正文真实编号 → 关子 → 关父。

对每张票：

1. `issue-search` 查 marker 或精确标题 + `specdev:published`。
2. 已存在且 marker 在且已关闭 → 账本 `closed`，跳过。
3. 已存在且 marker 在但仍 open → 只补 `issue-comment-close`。
4. 已存在但无 marker → 停止该行，展示冲突，不覆盖别人的 Issue。
5. 不存在 → dry-run `issue-create` → 授权后 `--apply` → 立刻 `issue-comment-close`，marker 双写（正文 Provenance + 关闭评论）。
6. 任一步失败：该行 `failed`，记录已完成步骤和下一重试动作；已成功的票不回滚。

`--apply` 只表示调用方完成本次确认，不替代授权。远程失败不回滚本地完成事实。

全部纳入票到达 `closed` 或合法 `skipped:*`，且无 `failed` 时：`publish_action: published`，填写 `published_at`。用户明确放弃：`waived`。重跑是恢复，不是重发。

摄入源 Change：本协议只建票 Issue。原来的源 Issue 仍由 reconcile 关闭；源 Issue ≠ 票 Issue。reconcile 评论可以链接已发布编号。

## 5. 校验与计数

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --stage triage \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

workspace 计数：

```bash
node <Path>{roots.workflows}/specdev/T-triage/tools/publish-status.mjs</Path> \
  --state-root <Path>{roots.state}/specdev</Path>
```

数字只来自 active + archive 的 `<Path>{roots.state}/specdev/changes/{change}/publish.md</Path>`，不把 GitHub 搜索当权威。

## 完成标准

- 指定 completed Change 的 done 票均有对应 GitHub Issue，或账本有合法 skip；
- 每条已发布 Issue 带且仅带一个 type 标签，以及 `specdev:published` 与 `origin:*`；
- 关闭评论是 Evidence 脱敏投影；
- marker 使重跑不重复建贴；
- 本地源计入 `published_issues`；
- `<Path>{roots.state}/specdev/changes/{change}/publish.md</Path>` 与远程重读一致，失败行可恢复；
- Ticket / Spec / Evidence / completed 事实未被改写；
- 未授权时远程写入为零。
