# Beat Append Phase

## 输入

- 用户在 Beat Options 阶段选择的 beat
- 原始素材 Markdown，或 `speculo/.speculo/doc/<change>/fragments.md`
- `speculo/.speculo/doc/<change>/article.md`

## 产物

- `speculo/.speculo/doc/<change>/article.md`，由 `../_templates/writing-article-template.md` 填写或追加

## 填写引导

1. 写入前重新读取 `article.md`。
2. 从素材堆中抽取内容来填充当前 beat，可以改写、拆分、重组或引用。
3. 只写当前 beat，写完就停。
4. beat 长度由它自身需要决定；过长时拆成后续 beat。
5. 写入后更新 `beat-log.md`，记录实际写入摘要和下一轮可转向方向。

## 边界

- 不提前写下一个 beat。
- 不忽略用户在上一轮之后对文章做的编辑。
- 不因为素材未用完而强行继续。

## 完成准则

- 当前 beat 已写入 `article.md`
- 已更新 `.status.json` 的 `beat_count` 和 `current_beat_status`
- `article.md` 无残留 `[TODO:]`
