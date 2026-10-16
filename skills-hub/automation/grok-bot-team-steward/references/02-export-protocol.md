# 导出协议（snapshot）

## 阶段

```
盘点 → 命名目录 → 建骨架 → 逐 Bot 自述 → 对话落盘 → 共享层 → 脱敏 → MANIFEST → 汇报
```

中途崩溃：保留 `meta/IN_PROGRESS.md`，下一轮从该文件记录的「已完成 slug」续跑，不另开日期目录，除非用户要求新快照。

## 盘点

1. 列出本账号全部可见 Bot（含隐藏的，如果能看到）
2. 列出群聊与成员
3. 列出 Settings → Plugins → Yours 里能枚举的技能
4. 只列出本次已确认工作区的必要顶层目录
5. 写成 ROSTER 草稿给用户看一眼——用户说「漏了 X / 不要 Y」以用户为准

## 让 Bot 自述（用户授权团队联络时）

若只允许文件导出，从现有可读材料收集并记录缺口，不因加载本技能自动联系其他 Bot。

对每个 slug 发送 `references/07-prompts.md` 里的「单 Bot 自述导出」，并把目标绝对路径写进提示词。

超时或拒绝：

- 先检查是否已经回复或写入目标文件；确认未完成且允许再次联系时再催一次，缩短为只要 PROFILE + routines 名称
- 仍失败则 steward 代写能看到的部分，GAPS.md 标记

不要让两个 Bot 同时写同一个文件。

## 管家自己写的部分

- CHARTER / ORG / rooms / connectors / workspace-map / MANIFEST / 根 GAPS / DROP-LIST
- 某个 Bot 确认无法访问自己的 memory-log 时，管家能读到什么就写什么

## 工作区文件

`shared/workspace-map.md` 记录路径、是否已复制进快照、体积。

仅在本次导出范围内、完成所有者与敏感性审阅后复制：

- 具名 Bot 所需的已审阅文件，不递归复制整份家目录
- 实际技能目录内获准携带的技能包
- 用户点名的项目目录

默认不复制：

- `node_modules`、浏览器 profile、`.git` 对象过大时只记 remote URL
- 任何匹配脱敏规则的文件

## 结束

1. 脱敏扫描
2. 写 MANIFEST
3. 运行结构校验并核对覆盖。成功才删 IN_PROGRESS、写真实 completed_at 的 COMPLETED；失败保留 IN_PROGRESS 与 GAPS
4. 按用户已请求的交付方式继续；推私有 Git 或分享需相应授权，不强制追加分发流程
