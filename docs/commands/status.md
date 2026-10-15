# Status：查看当前进度与异常

[手册首页](../README.md) · [Command 目录](README.md) · [源入口](../../template/commands/status/COMMAND.md)

**业务 ID：** `command/status`

## 什么时候用

刚打开项目，不知道安装了哪些领域；工作很多，想知道哪些活动尚未结束；切换会话后，想先看下一步入口。它只发现和汇总，不激活 Work，也不自动修复。

## 怎样调用

```text
明确调用 command/status，汇总当前项目的已安装领域、活动对象、异常和下一步入口。
只在会话中报告，按各领域自己的状态解释。
```

需要保存快照时明确说“将这次状态报告保存到命令规定的位置”。安装后的入口是 `.agents/speculo/commands/status/COMMAND.md`，需要有效 workspace 来解析数据根。

## 你会得到什么

- SpecDev：目录与 README Outcome、接续点、已结束未归档对象，以及实际存在的外部交付账本。
- Learning：课程/主题、Lesson/Homework、即时与延迟表现、整合与复习信息。
- OPS：主机、项目、部署、版本、检查和双边文档状态，不套用 change 数量模型。
- 其他领域：依其当前 schema 解释；未知结构列异常并保留原件。

数字以本地权威记录为准，不临时扫 GitHub 代替本地账本。没有可靠更新时间时写 unknown，不能只靠 mtime 宣称 SpecDev 停滞。

## 看完怎么办

给出报告中的实际对象和 Work，明确请求继续。如果有未知 schema、重复身份、断链或未闭合事务，先沿原 owner 恢复。状态报告本身不证明代码通过测试，也不代表线上部署健康。
