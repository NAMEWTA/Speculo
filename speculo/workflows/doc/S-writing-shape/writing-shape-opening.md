# Opening Choice Phase

## 输入

- 原始素材 Markdown，或 `.speculo/doc/<change>/fragments.md`
- `.speculo/doc/<change>/article.md` 的当前内容；如果不存在，视为空文章

## 产物

- `.speculo/doc/<change>/shape-log.md`，由 `../_templates/writing-shape-log-template.md` 填写或追加

## 填写引导

1. 完整读取素材堆，形成整体理解。
2. 起草 2-3 个候选开头；每个开头暗示文章不同论点或角度。
3. 全部展示给用户，要求选择一个或组合出混合版本。
4. 记录被选开头承诺了什么；后续所有段落都必须服务这个承诺，或推动用户修改开头。

## 边界

- 不编辑素材文件。
- 不在用户选择前写入文章正文。

## 完成准则

- `shape-log.md` 已记录候选开头、推荐选项、用户选择和开头承诺
- `.status.json` 的 `opening_status` 已更新
