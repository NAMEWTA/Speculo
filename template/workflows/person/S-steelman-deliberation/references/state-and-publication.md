# Steelman 状态与候选发布合同

新建、恢复或写入状态前读取状态合同；发布 dossier 时只读取回答前分支，发布 decision 时只读取回答后分支。所有路径、schema 和字段沿用原版，禁止另建状态源。

## 状态合同

### Workflow 状态

`<Path>{roots.state}/person/status.json</Path>` 保持 `schema_version: 1`，本 work 只管理 `active` 数组中的如下条目：

```json
{
  "change": "2026-08-18-steelman-company-anniversary",
  "work_id": "person/steelman-deliberation",
  "phase": "awaiting-answer",
  "updated_at": "2026-08-18T00:00:00.000Z"
}
```

读取—合并—写入时保留未知顶层字段、未知 entry 字段和其他 work 的全部条目。写临时文件、重读 JSON、再原子替换。

### Change 状态

`<Path>{roots.state}/person/changes/{change}/.status.json</Path>` 至少包含：

```json
{
  "schema_version": 1,
  "artifact": "person-work-status",
  "workflow": "person",
  "change": "2026-08-18-steelman-company-anniversary",
  "work_id": "person/steelman-deliberation",
  "status": "active",
  "phase": "awaiting-answer",
  "key_question": "[唯一关键问题]",
  "key_question_asked": true,
  "question_disposition": "asked",
  "answer_received": false,
  "user_answer": null,
  "created_at": "2026-08-18T00:00:00.000Z",
  "updated_at": "2026-08-18T00:00:00.000Z",
  "completed_at": null,
  "blockers": []
}
```

允许转换：

```text
intake → deliberating → awaiting-answer → judging → completed
任一活动阶段 → blocked
awaiting-answer → reframe-required
```

`question_disposition` 只能是 `asked | already-answered`；前者要求 `key_question_asked: true`，后者要求 `key_question_asked: false`。工件先验证，change 状态后更新，workflow active 最后更新。状态只是工件的索引，不替代工件本身。


## 回答前：发布 dossier

使用 `<Path>{roots.workflows}/person/S-steelman-deliberation/_templates/steelman-dossier-template.md</Path>` 在 change 目录下的唯一临时子目录中写入候选 dossier 与候选 `.status.json`，重读后运行：

```bash
node <Path>{roots.workflows}/person/S-steelman-deliberation/tools/validate-steelman-change.mjs</Path> \
  --phase awaiting-answer \
  --change-dir <Path>{roots.state}/person/changes/{change}</Path> \
  --dossier-file <Path>{roots.state}/person/changes/{change}/.steelman-stage/steelman-dossier.md</Path> \
  --status-file <Path>{roots.state}/person/changes/{change}/.steelman-stage/.status.json</Path>
```

临时目录名在并发时追加唯一后缀。校验通过后，先原子替换正式 dossier，再原子替换 change `.status.json`；workflow active 只在入口的等待回答阶段 确认需要等待用户时更新。校验失败时删除临时目录并保持正式工件和旧状态不变。


## 回答后：发布 decision

使用 `<Path>{roots.workflows}/person/S-steelman-deliberation/_templates/decision-template.md</Path>` 在唯一临时目录中写入候选 decision 与候选完成态 `.status.json`，随后运行：

```bash
node <Path>{roots.workflows}/person/S-steelman-deliberation/tools/validate-steelman-change.mjs</Path> \
  --phase completed \
  --change-dir <Path>{roots.state}/person/changes/{change}</Path> \
  --decision-file <Path>{roots.state}/person/changes/{change}/.steelman-stage/decision.md</Path> \
  --status-file <Path>{roots.state}/person/changes/{change}/.steelman-stage/.status.json</Path>
```

校验通过后才原子替换正式 decision 和 change 状态，并只从 workflow `status.json.active` 删除匹配当前 `change` 且属于本 work 的条目。校验失败时删除临时目录、返回 `validation-failed`，保留可恢复的 `judging` 状态。

