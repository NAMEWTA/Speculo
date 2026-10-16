# 路径与 config.json

`$SKILL_DIR` 是含 `SKILL.md` 的目录。`persist_root` 是产物根。`kb_root` 是用户知识库，只读。

## 解析

1. 本轮用户给出的路径优先。
2. 其次读已存在的 `$persist_root/config.json`。
3. 再读 `$SKILL_DIR/config.json`。
4. 都没有就问。不要猜。

「就用当前目录」= `<cwd>/job-application`。相对路径先展开成绝对路径再写入。

## JSON

两份文件字段相同。技能目录那份是指针，产物根那份是自描述。重装技能后，若用户还指向旧产物根，可从产物根把 JSON 抄回技能目录。

```json
{
  "schema_version": 1,
  "skill": "job-application",
  "persist_root": "/abs/job-application",
  "kb_root": "/abs/notes",
  "locale": "zh",
  "page_budget": 2,
  "updated_at": "2026-09-21T00:00:00.000Z"
}
```

禁止写入 token、简历正文、电话、邮箱、成就数字。

改路径只重写 JSON，不自动搬家。用户要求搬家时，复制 `corpus/` 与 `applications/` 后再改指针。

`persist_root` 不得落在 `$SKILL_DIR` 里面。`write_config.py` 会拒绝。
