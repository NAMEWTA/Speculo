# Mission Setup Phase

## 输入

- 用户声明的学习主题或模糊兴趣
- 用户对「为什么想学这个」的任何初始表述
- 当前 doc change 目录：`.speculo/doc/<change>/`

## 产物

- `.speculo/doc/<change>/mission.md`，由 `../_templates/teach-mission-template.md` 填写

## 填写引导

1. 若用户未给出具体目标，追问「你学这个最终想做到什么？」，直到得到可观测的行为描述——不是「了解 X」而是「能做 Y」。
2. 从用户的回答中提炼 Why（1-3 句）、Success（具体可观测事项）、Constraints（时间/预算/偏好）、Out of scope（明确不做的话题）。
3. 追问时保持具体：避免抽象框架，逼向真实世界的成果。
4. 用户说不清时，继续访谈；坏使命比没使命更糟，但模糊使命也要被推回。
5. 使命确立后与用户逐条确认，确认后才进入 Phase 2。

## 边界

- 不在此阶段搜集学习资源或设计课程。
- 不编造用户的动机或目标——一切来自用户原话。
- 使命可以后续修订，但修订必须经用户确认并写 learning record 记录变更原因。

## 完成准则

- Why / Success / Constraints / Out of scope 四段均已填写
- 每条 Success 是可观测的、可判断是否达成的
- 用户已逐条确认使命内容
- `mission.md` 无残留 `[TODO:]`
- 已创建 `NOTES.md`（空文件，用于后续记录教学偏好）
