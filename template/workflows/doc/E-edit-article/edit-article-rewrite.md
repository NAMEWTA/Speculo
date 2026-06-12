# Section Rewrite Phase

## 输入

- `speculo/.speculo/doc/<change>/edit-plan.md`
- 用户确认后的章节顺序
- 原始草稿

## 产物

- `speculo/.speculo/doc/<change>/edited-article.md`，由 `../_templates/edit-article-template.md` 填写

## 填写引导

1. 按确认后的章节顺序逐节编辑。
2. 重写每节以提升清晰度、连贯性和流畅度。
3. 每段最多 240 个字符；超过时拆段。
4. 保留必要的术语、代码实体、引用和用户明确要求保留的句子。
5. 若某节依赖前文未解释的信息，调整顺序或补最小必要上下文。
6. 每完成一节，允许用户审阅并要求局部修改。

## 边界

- 不新增用户没有授权的新论点。
- 不把文章改成另一种发布平台格式，除非用户明确要求。

## 完成准则

- 已按 `edit-plan.md` 完成所有确认章节
- `.status.json` 的 `edit_status` 已更新
- `edited-article.md` 无残留 `[TODO:]`
