# Fragment Interview Phase

## 输入

- 用户的主题、初始 prompt 或已有素材
- `speculo/.speculo/doc/<change>/fragments.md` 的当前内容；若不存在，按模板创建
- 当前对话中出现的主张、小场景、锋利句子、半成形想法、引用或观察

## 产物

- `speculo/.speculo/doc/<change>/fragments.md`，由 `../_templates/writing-fragments-template.md` 填写或追加

## 填写引导

1. 如果 `fragments.md` 不存在，先创建 H1 工作标题。
2. 持续追问用户“你到底注意到了什么”，不要强加提纲、阶段或文章结构。
3. 任一方产生可保留 fragment 时，先重新读取 `fragments.md`，再追加到文件末尾。
4. fragment 之间使用独立的 `---` 分隔。
5. fragment 可以是句子、段落、列表、代码、引用或一组相关观察，以素材自然形态为准。
6. 用户要求“删掉最后一个”“改得更锋利”“合并那两个”时，按具体 fragment 原地编辑，其他内容保持不变。

## 边界

- 不塑造文章结构。
- 不添加 metadata、TOC、日期、标签。
- 不为了保存每个 fragment 反复询问许可。

## 完成准则

- 本轮值得保留的 fragment 已写入 `fragments.md`
- 写入前已重新读取文件并保留用户编辑
- `fragments.md` 无残留 `[TODO:]`
