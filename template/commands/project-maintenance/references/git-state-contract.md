# 本次目标的 Git 与 state

仅 `mode=commit` 使用。调用方负责 Git 与持久化，audit/update 不执行任何提交或游标写入。保留 state v4 与 sidecar v1。

## 固定输入与写集

1. 记录仓库、分支和 `INPUT_HEAD`，核对没有未结束的 merge/rebase/cherry-pick/revert/bisect 或冲突。固定输入后 HEAD 变化则停止本次提交，重新确定输入。
2. 用 `git status --short` 与 staged/unstaged/untracked 清单区分本次写集与无关内容；`git diff --check` 及其 `--cached` 检查只针对显式本次路径，无关文件的格式问题不阻塞提交。记录写集的 before-image 和无关 index 条目/工作区内容；发现密钥只报告位置，不把内容写入报告。
3. 不创建 checkpoint workspace commit，不要求全仓干净。无关脏文件和暂存内容保留；目标已有用户改动时保留原文，仅在本次授权涵盖拟提交完整内容时纳入，无法区分的重叠写集阻塞。
4. 文档事实来自固定已提交输入；如果结论依赖未提交业务事实，可完成分析或获批更新，但本次 commit/同步基线阻塞，不能用自动提交业务代码解决。仅作导航、不影响结论的无关脏文件不构成阻塞。
5. 在独立临时目录导出 `INPUT_HEAD` 的跟踪树，叠加本次候选文档，运行受影响的项目验证；不把无关脏文件带入验证证据。纯链接/格式检查可直接核对本次目标。保存命令、结果及输入摘要。

## State v4 与输入基线

全局路径 `<Path>{roots.state}/commands/project-maintenance/state.json</Path>`，字段与 [state 模板](../assets/state-template.json) 一致。

- `baseline.mode=state-file-commit`：`git log -1 --format=%H -- "$STATE_FILE"` 是 FROM_SHA；必须实际找到该文件的提交。
- `baseline.mode=explicit`：使用 `baseline.sha`，null 表示 bootstrap。
- 非空 FROM_SHA 必须是 INPUT_HEAD 的祖先；缺失历史、未知 schema 或不合法 SHA 只阻塞提交/游标，保留原数据。
- `last_range` 保存 `{from_sha: FROM_SHA, to_sha: INPUT_HEAD}`。非 bootstrap 可用 `git diff "$FROM_SHA..$INPUT_HEAD"` 复现变化线索；完整审查证据绑定 INPUT_HEAD 当前树，不局限于 diff。
- `project_targets` 保存全局管理目标；workflow 目标依据 [范围合同](workflow-scope-contract.md)。owner 转移同时更新有关记录。

仅接受当前 state schema；其他版本保留原件并停止受影响的基线写入。旧命令目录、sidecar、tracked_docs 或旧游标不作为输入，不自动迁移。

## 何时持久化

先完成全局清单，再判断：有实际文档变化、确认范围/迁移变化，或已完整审查的新输入基线，才写必要报告、state 和相关 sidecar。更新 last_range、实际 synced_assets、运行时间与 total_syncs；范围改变才增加 scope_revision。没有上述变化时直接返回 no-op，不因时间戳、计数或生成报告制造提交。

新范围的所有必需动作和验证都完成后才推进游标。尚未授权的知识建议可作为 propose-only 交回 owner，不写成已同步资产；必需工作 blocked 时保留分析/获批文档结果，state 与 sidecar 不推进。

## 仅提交本次目标

1. 在同目录临时文件准备 state/sidecar/报告，重验目标摘要、HEAD 与无关 index，原子替换并重读。报告选择新编号不覆盖；state 不保存 diff、批准原文、绝对路径或秘密。
2. 建立显式项目相对文件列表，包含本次授权文档及必要报告/state/sidecar。对已有和新增文件按字面路径暂存；使用 `git --literal-pathspecs add -A -- <本次文件列表>`，再用 `git --literal-pathspecs commit --only -m <消息> -- <同一文件列表>`，让无关暂存内容留在 index。目标根、glob、`git add .` 不作为文件列表。删除路径必须已有删除授权。
3. 文档修改使用 `docs(project-maintenance): synchronize project documentation`；只有确需记录新基线或范围且无文档变化时，使用 `chore(project-maintenance): record no-op synchronization`。这是必要 state 提交，不是每次运行都要求的空提交；不使用 --allow-empty。
4. 成功后核对提交父节点等于 INPUT_HEAD、变更路径仅在批准列表、提交内容与验证快照一致；比较无关工作区内容与 index 条目保持不变。本次目标与提交一致即可，不要求全仓 status 为空。
5. 回读 state 与 sidecar，确认其文件历史定位本次输出 commit；下次 FROM_SHA 因而跳过本次文档/报告提交。

提交失败时保留候选文档、暂存内容、原 state before-image 和命令证据，不 reset、stash、clean、amend 或盲目重试。恢复先检查 HEAD/实际提交：若 commit 未创建，未提交的 state/sidecar 仅是候选，不得被下一次运行当作已推进基线；从最近已提交 state（首次运行用 before-image）恢复本次输入后续作，重新核验写集与授权。已创建的 commit 不重复提交；任何不一致只阻塞受影响后续操作。
