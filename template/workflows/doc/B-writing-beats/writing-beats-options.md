# Beat Options Phase

## 输入

- 原始素材 Markdown，或 `speculo/.speculo/doc/<change>/fragments.md`
- `speculo/.speculo/doc/<change>/article.md` 的当前内容；如果不存在，视为空文章
- `speculo/.speculo/doc/<change>/beat-log.md`

## 产物

- `speculo/.speculo/doc/<change>/beat-log.md`，由 `../_templates/writing-beat-options-template.md` 填写或追加

## 填写引导

1. 完整读取素材和当前文章。
2. 若文章为空，提出 2-3 个候选起始 beat；每个代表不同入口。
3. 若文章已有内容，提出 2-3 个候选下一个 beat；每个代表从当前位置可以转向的不同方向。
4. 候选只做预览，不写入 `article.md`。
5. 要求用户选择一个候选，或组合出混合版本。

## 边界

- 不一次性规划完整提纲。
- 不写入文章正文。

## 完成准则

- `beat-log.md` 已记录候选、推荐选项、用户选择或 blocked 原因
- 用户已选择当前要写的 beat，或明确要求暂停
