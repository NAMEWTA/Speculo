# Block Shaping Phase

## 输入

- 用户选定的开头与当前文章
- 原始素材 Markdown，或 `speculo/.speculo/doc/<change>/fragments.md`
- `speculo/.speculo/doc/<change>/shape-log.md`

## 产物

- `speculo/.speculo/doc/<change>/article.md`，由 `../_templates/writing-article-template.md` 填写或追加

## 填写引导

1. 每轮先问：基于当前文章，读者接下来需要听到什么。
2. 从素材堆中抽取 fragment，改写以适配上下文段落。
3. 公开讨论格式选择：散文、列表、表格、callout、引用、代码块。
4. 如果素材堆缺少文章需要的东西，明确指出缺口，让用户补充或删除相关章节。
5. 每个块达成一致后重新读取 `article.md`，再追加。
6. 如果用户想重写某段，只原地编辑那个具体段落。

## 边界

- 不挖掘素材堆中不存在的新 fragments；只指出缺口。
- 不编辑原始素材文件。
- 不发布或适配特定平台格式，除非用户明确要求。

## 完成准则

- 每个新增块都有明确作用和格式选择记录
- `shape-log.md` 已记录重要删改、缺口和格式争议
- `article.md` 无残留 `[TODO:]`
